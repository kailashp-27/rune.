import {test} from 'node:test';
import assert from 'node:assert/strict';
import {difficultyAction,seededRandom} from './difficulty';
test('tier behavior differs in action choice rather than only elapsed time',()=>{let easyMistakes=0,mediumMistakes=0,hardMistakes=0;const rng=seededRandom(61);for(let i=0;i<1000;i++){easyMistakes+=Number(difficultyAction('Easy',0,[true,true,false],[.9,.1,0],rng)!==0);mediumMistakes+=Number(difficultyAction('Medium',0,[true,true,false],[.9,.1,0],rng)!==0);hardMistakes+=Number(difficultyAction('Hard',0,[true,true,false],[.9,.1,0],rng)!==0);}assert.ok(easyMistakes>mediumMistakes*3);assert.equal(hardMistakes,0);assert.equal(difficultyAction('Easy',0,[false,true,false],[1,0,0],()=>0),1);});
