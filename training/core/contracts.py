"""Validate checkpoint identity before exporting game-specific assets."""
from training.games.registry import GAMES


def checkpoint_game(checkpoint):
    # Legacy checkpoints predate the game field and were Connect Four only.
    game_id = checkpoint.get('game', 'connect4')
    if game_id not in GAMES:
        raise ValueError(f'Unsupported checkpoint game: {game_id}')
    game = GAMES[game_id]
    if checkpoint.get('rules_version', 'connect4-v1') != game.RULES_VERSION:
        raise ValueError('Checkpoint rules version does not match this game')
    config = checkpoint['config']
    dimensions = tuple(config[key] for key in ('planes', 'height', 'width', 'actions'))
    if dimensions != (*game.INPUT_SHAPE, game.ACTION_SIZE):
        raise ValueError('Checkpoint input/action dimensions do not match this game')
    return game_id, game
