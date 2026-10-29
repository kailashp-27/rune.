import importlib.util
import io
import unittest
from training.core.replay import pack, compact, tensors

@unittest.skipUnless(importlib.util.find_spec('torch'), 'PyTorch optional in rules CI')
class ReplayTests(unittest.TestCase):
    def test_compact_targets_and_legacy_replay_survive_safe_checkpoint_roundtrip(self):
        import torch
        planes=[[[.1,.7],[1,0]]];policy=[0,.1,.2,.7];value=-1
        entry=pack(planes,policy,value)
        self.assertEqual(len(entry[0]),8)
        self.assertEqual(compact(entry),entry)
        stream=io.BytesIO();torch.save({'replay':[entry]},stream);stream.seek(0)
        restored=torch.load(stream,weights_only=True)['replay'][0]
        x,p,v=tensors([restored,(planes,policy,value)],(1,2,2))
        torch.testing.assert_close(x[0],torch.tensor(planes),atol=.0003,rtol=.001)
        self.assertEqual(p[0,0],0);self.assertAlmostEqual(p[0].sum().item(),1)
        torch.testing.assert_close(p[0],p[1]);self.assertEqual(v.tolist(),[-1,-1])
