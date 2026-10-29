"""Game-agnostic PUCT. Every node value is relative to its side to move."""
import math
import random
from dataclasses import dataclass, field
from training.core.transitions import initial, advance

@dataclass
class Node:
    state: dict
    prior: float = 1.0
    visits: int = 0
    value: float = 0.0
    children: dict = field(default_factory=dict)


@dataclass
class ChanceEdge:
    prior: float
    visits: int = 0
    value: float = 0.0  # Relative to the player choosing this action.
    outcomes: dict = field(default_factory=dict)


def chance_search_requests(game, state, simulations, noise, rng):
    """PUCT over actions; sample independent chance outcomes after every action."""
    root = Node(state)
    for _ in range(simulations):
        node = root
        path, edges = [node], []
        while node.children and not game.isTerminal(node.state)['done']:
            action, edge = max(node.children.items(), key=lambda item:
                item[1].value / max(1, item[1].visits) + 1.5*item[1].prior*math.sqrt(node.visits+1)/(1+item[1].visits))
            wave = rng.choice(game.chanceOutcomes(node.state))
            if wave not in edge.outcomes:
                edge.outcomes[wave] = Node(game.applyMove(node.state, action, wave))
            edges.append((edge, node.state['player']))
            node = edge.outcomes[wave]
            path.append(node)
        terminal = game.isTerminal(node.state)
        if terminal['done']:
            value = terminal['winner']*node.state['player']
        else:
            policy, value = yield node.state
            actions = [a for a, ok in enumerate(game.legalMoves(node.state)) if ok]
            weights = [max(0, policy[a]) for a in actions]
            total = sum(weights)
            priors = [weight/total if total else 1/len(actions) for weight in weights]
            if node is root and noise:
                samples = [rng.gammavariate(.3, 1) for _ in actions]
                mass = sum(samples)
                priors = [.75*p+.25*n/mass for p,n in zip(priors,samples)]
            node.children = {a: ChanceEdge(p) for a,p in zip(actions,priors)}
        absolute = value*node.state['player']
        for ancestor in path:
            ancestor.visits += 1
            ancestor.value += absolute*ancestor.state['player']
        for edge, player in edges:
            edge.visits += 1
            edge.value += absolute*player
    counts = [root.children[a].visits if a in root.children else 0 for a in range(game.ACTION_SIZE)]
    total = sum(counts)
    if total:
        return [count/total for count in counts]
    mask = game.legalMoves(state)
    return [float(ok)/max(1,sum(mask)) for ok in mask]

def search_requests(game, state, simulations=100, noise=False, rng=None):
    """Coroutine: yield a leaf state, receive its policy/value evaluation."""
    rng = rng or random.Random()
    if hasattr(game, 'chanceOutcomes'):
        return (yield from chance_search_requests(game, state, simulations, noise, rng))
    root = Node(state)
    for _ in range(simulations):
        node = root
        path = [node]
        while node.children and not game.isTerminal(node.state)['done']:
            node = max(node.children.values(), key=lambda c:
                       -c.value / max(1, c.visits) + 1.5 * c.prior * math.sqrt(node.visits + 1) / (1 + c.visits))
            path.append(node)
        result = game.isTerminal(node.state)
        if result['done']:
            value = result['winner'] * node.state['player']
        else:
            policy, value = yield node.state
            actions = [a for a, ok in enumerate(game.legalMoves(node.state)) if ok]
            weights = [max(0, policy[a]) for a in actions]
            total = sum(weights)
            priors = [w / total if total else 1 / len(actions) for w in weights]
            if node is root and noise:
                samples = [rng.gammavariate(0.3, 1) for _ in actions]
                z = sum(samples)
                priors = [.75 * p + .25 * n / z for p, n in zip(priors, samples)]
            node.children = {a: Node(game.applyMove(node.state, a), p) for a, p in zip(actions, priors)}
        for ancestor in reversed(path):
            ancestor.visits += 1
            ancestor.value += value
            value = -value
    counts = [root.children[a].visits if a in root.children else 0 for a in range(game.ACTION_SIZE)]
    total = sum(counts)
    if not total:
        mask = game.legalMoves(state)
        total = sum(mask)
        return [float(ok) / max(1, total) for ok in mask]
    return [n / total for n in counts]

def drive(requests, evaluate):
    try:
        state = next(requests)
        while True:
            state = requests.send(evaluate(state))
    except StopIteration as finished:
        return finished.value

def search(game, state, evaluate, simulations=100, noise=False, rng=None):
    return drive(search_requests(game, state, simulations, noise, rng), evaluate)

def self_play_requests(game, simulations=100, rng=None):
    rng = rng or random.Random()
    state = initial(game, rng)
    positions = []
    while not (result := game.isTerminal(state))['done']:
        policy = yield from search_requests(game, state, simulations, noise=True, rng=rng)
        positions.append((state, policy))
        action = rng.choices(range(game.ACTION_SIZE), weights=policy)[0] if state['turn'] < 10 else max(range(game.ACTION_SIZE), key=policy.__getitem__)
        state = advance(game, state, action, rng)
    return [(s, p, result['winner'] * s['player']) for s, p in positions]

def self_play(game, evaluate, simulations=100, rng=None):
    return drive(self_play_requests(game, simulations, rng), evaluate)

def batched_self_play(game, evaluate_many, games, simulations=100, batch_size=8, seed=42):
    """Interleave independent game coroutines; one neural batch per scheduler tick.

    Each game owns a seed, so batch size and completion order don't change its RNG.
    Results are returned in game-index order, not completion order.
    """
    if min(games, simulations, batch_size) < 1:
        raise ValueError('Games, simulations and batch size must be positive')
    results = [None] * games
    active = {}
    next_game = 0

    def start_game(index):
        requests = self_play_requests(game, simulations, random.Random(seed + index))
        try:
            active[index] = (requests, next(requests))
        except StopIteration as finished:
            results[index] = finished.value

    while next_game < games or active:
        while len(active) < batch_size and next_game < games:
            start_game(next_game)
            next_game += 1
        indices = list(active)
        evaluations = evaluate_many([active[index][1] for index in indices])
        if len(evaluations) != len(indices):
            raise ValueError('Evaluator returned the wrong batch size')
        for index, evaluation in zip(indices, evaluations):
            requests, _ = active[index]
            try:
                active[index] = (requests, requests.send(evaluation))
            except StopIteration as finished:
                results[index] = finished.value
                del active[index]
    return results

def arena(game, challenger, champion, games=20, simulations=50, seed=42):
    if games < 2 or games % 2:
        raise ValueError('Arena games must be positive, even, and at least two')
    score = 0
    rng = random.Random(seed)
    opening = []
    for index in range(games):
        side = 1 if index % 2 == 0 else -1
        state = initial(game, rng) if index % 2 == 0 else paired_start
        if index % 2 == 0:
            opening = []
            for _ in range(rng.randrange(5)):
                action = rng.choice([a for a, ok in enumerate(game.legalMoves(state)) if ok])
                opening.append(action)
                state = advance(game, state, action, rng)
            paired_start = state
        play_rng = random.Random(seed + 10000 + index//2)
        search_rng = random.Random(seed + 20000 + index//2)
        while not (result := game.isTerminal(state))['done']:
            evaluator = challenger if state['player'] == side else champion
            policy = search(game, state, evaluator, simulations, rng=search_rng)
            state = advance(game, state, max(range(game.ACTION_SIZE), key=policy.__getitem__), play_rng)
        score += 1 if result['winner'] == side else .5 if not result['winner'] else 0
    return score / games
