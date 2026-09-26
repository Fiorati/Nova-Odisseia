import {describe,expect,it} from 'vitest';
import {SEED,filterLeads,focusFlag,cnpjFormat,weeklySummary,weekBounds} from '../client/stone-psv/model';
describe('Stone PSV sandbox',()=>{
 it('filters stage, route and agent without changing source',()=>{expect(filterLeads(SEED,'Credenciado','Rota Leste','Consultor B').map(x=>x.id)).toEqual(['EX-04']);expect(SEED).toHaveLength(5)});
 it('keeps absent TPV distinct from zero',()=>{expect(focusFlag(SEED[4])).toBe('TPV pendente');expect(focusFlag({...SEED[4],tpv:0})).toBe('Fora do foco 100k-300k')});
 it('summarizes the week from only scheduled synthetic actions and local marks',()=>{expect(weekBounds('2026-09-28')).toEqual(['2026-09-28','2026-10-04']);expect(weeklySummary(SEED,[{id:'EX-01',checkpoint:true,done:true},{id:'EX-03',checkpoint:true,done:false}], '2026-09-28')).toEqual({planned:5,checked:2,done:1})});
 it('does not count marks from outside the selected week',()=>{expect(weeklySummary(SEED,[{id:'EX-01',checkpoint:true,done:true}], '2026-10-05')).toEqual({planned:0,checked:0,done:0})});
 it('masks input but never treats it as a verified lookup',()=>{expect(cnpjFormat('12.345.678/0001-90')).toBe('12.345.678/0001-90');expect(cnpjFormat('1234')).toBe('12.34');expect(cnpjFormat('abc')).toBe('')});
});
