"""Separate sampled live transitions from deterministic rules used in search/parity."""
def initial(game, rng):
    return game.sampleInitial(rng) if hasattr(game, 'sampleInitial') else game.initialState()


def advance(game, state, action, rng):
    return game.sampleMove(state, action, rng) if hasattr(game, 'sampleMove') else game.applyMove(state, action)
