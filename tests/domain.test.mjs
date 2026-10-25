import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, normalizeContact, estimate, valuationReady, csvCell } from '../lib/domain.mjs';
const seller={kind:'seller',firstName:'Jean',contact:'jean@example.test',horizon:'this-year'};
const rules={approved:true,approvedAt:'2026-10-25',replacementCostLoaded:80000,cashPolicy:'excess-only',multiples:{Test:[2,3]}};
test('unknown fields and financial figures are never stored without permission',()=>{
 const x=validateLead({...seller,figures:{debt:100},answers:[1],secret:'private'});
 assert.equal(x.details.figures,undefined);assert.equal(x.details.answers,undefined);assert.equal(x.secret,undefined);
});
test('seller requires a valid horizon and contact',()=>{
 for(const change of [{horizon:''},{contact:'fake'},{firstName:''}])assert.throws(()=>validateLead({...seller,...change}));
});
test('normalizes French phone and email for deduplication',()=>{
 assert.equal(normalizeContact('06 12 34 56 78'),'+33612345678');assert.equal(normalizeContact('0033 6 12 34 56 78'),'+33612345678');assert.equal(normalizeContact('JEAN@EXAMPLE.TEST'),'jean@example.test');
});
test('investor cannot bypass the activation or mandatory acknowledgments',()=>{
 const investor={kind:'investor',firstName:'Anne',contact:'anne@example.test',ticket:'undecided',profile:'individual',interestAcknowledged:true,risksAccepted:true};
 assert.throws(()=>validateLead(investor));assert.doesNotThrow(()=>validateLead(investor,{investorsEnabled:true}));
 assert.equal(validateLead({...investor,alternateContact:'06 12 34 56 78'},{investorsEnabled:true}).details.alternateContact,'+33612345678');
 const saved=validateLead({...investor,wealthShare:'private',newsletter:true},{investorsEnabled:true});assert.equal(saved.details.wealthShare,undefined);assert.equal(saved.consent.newsletter,false);
 assert.throws(()=>validateLead({...investor,ticket:'invented'},{investorsEnabled:true}));assert.throws(()=>validateLead({...investor,profile:'invented'},{investorsEnabled:true}));
 for(const k of ['ticket','profile','interestAcknowledged','risksAccepted'])assert.throws(()=>validateLead({...investor,[k]:''},{investorsEnabled:true}));
});
test('diagnostic answers need separate permission and must match the score',()=>{
 const diagnostic={...seller,kind:'diagnostic',score:10,answers:Array(10).fill(1)};
 assert.equal(validateLead(diagnostic).details.answers,undefined);
 assert.deepEqual(validateLead({...diagnostic,shareDetails:true}).details.answers,diagnostic.answers);
 assert.throws(()=>validateLead({...diagnostic,shareDetails:true,score:9}));
});
test('valuation requires complete approved rules and uses loaded replacement cost',()=>{
 assert.equal(valuationReady(rules),true);assert.equal(valuationReady({...rules,approved:false}),false);assert.equal(valuationReady({...rules,multiples:{Test:[3,2]}}),false);
 assert.deepEqual(estimate({revenue:1000000,ebe:100000,remuneration:50000,excessCash:20000,debt:30000},'Test',rules),{adjusted:70000,low:130000,high:200000});
 assert.equal(estimate({revenue:1000,ebe:-10,remuneration:0,excessCash:0,debt:0},'Test',rules).low,null);
 assert.throws(()=>estimate({revenue:-1,ebe:10,remuneration:0,excessCash:0,debt:0},'Test',rules));
});
test('CSV protects spreadsheet formula injection and quotes',()=>{
 assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');assert.equal(csvCell('hello'),'"hello"');
});

test('debt exceeding the entire valuation range produces a discussion instead of zero price',()=>{
 const result=estimate({revenue:1000000,ebe:100000,remuneration:50000,excessCash:20000,debt:300000},'Test',rules);
 assert.deepEqual(result,{adjusted:70000,low:null,high:null});
});
