/** Stone PSV sandbox. No external data, network calls, or persistence. */
export const STAGES = ["Mapeado", "Planejado", "Qualificando", "Em negociação", "Credenciado", "M0", "M1", "M2", "M3", "M4", "Churn"] as const;
export type Stage = typeof STAGES[number];
export type Lead = { id:string; name:string; agent:string; route:string; stage:Stage; tpv:number|null; task:string; taskDate:string; source:string; alert:string };
export const SEED: Lead[] = [
 {id:"EX-01",name:"Empresa Exemplo A",agent:"Consultor A",route:"Rota Norte",stage:"Mapeado",tpv:140000,task:"Retomar conversa",taskDate:"2026-09-28",source:"Demonstração",alert:"Reabordagem pendente"},
 {id:"EX-02",name:"Empresa Exemplo B",agent:"Consultor A",route:"Rota Norte",stage:"Planejado",tpv:180000,task:"Visita",taskDate:"2026-09-29",source:"Demonstração",alert:"Confirmar agenda"},
 {id:"EX-03",name:"Empresa Exemplo C",agent:"Consultor B",route:"Rota Leste",stage:"Em negociação",tpv:120000,task:"Rever proposta",taskDate:"2026-09-30",source:"Demonstração",alert:"Proposta em aberto"},
 {id:"EX-04",name:"Empresa Exemplo D",agent:"Consultor B",route:"Rota Leste",stage:"Credenciado",tpv:100000,task:"Primeira transação",taskDate:"2026-09-28",source:"Demonstração",alert:"Aguardando ativação"},
 {id:"EX-05",name:"Empresa Exemplo E",agent:"Consultor A",route:"Rota Norte",stage:"Churn",tpv:null,task:"Verificar queda",taskDate:"2026-10-01",source:"Demonstração",alert:"TPV ausente - verificar, não é zero"}
];
export type PromiseRecord = {id:string; checkpoint:boolean; done:boolean};
/** Local date prefix, avoiding timezone conversions for the demo. */
export function weekBounds(day:string):[string,string]{const d=new Date(`${day}T12:00:00Z`);if(Number.isNaN(d.getTime()))return ['',''];const monday=new Date(d);monday.setUTCDate(d.getUTCDate() - (d.getUTCDay()+6)%7);const sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);return [monday.toISOString().slice(0,10),sunday.toISOString().slice(0,10)]}
export function weeklySummary(leads:Lead[],marked:PromiseRecord[],day:string){const [from,to]=weekBounds(day);const planned=leads.filter(x=>x.taskDate>=from&&x.taskDate<=to);return {planned:planned.length,checked:planned.filter(x=>marked.find(p=>p.id===x.id)?.checkpoint).length,done:planned.filter(x=>marked.find(p=>p.id===x.id)?.done).length}}
/** Mask only. This never validates, transmits, or searches a CNPJ. */
export function cnpjFormat(input:string){const n=input.replace(/\D/g,'').slice(0,14);return n.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2')}
export function filterLeads(leads:Lead[],stage:string,route:string,agent:string):Lead[]{return leads.filter(l=>(stage==='Todas'||l.stage===stage)&&(route==='Todas'||l.route===route)&&(agent==='Todos'||l.agent===agent))}
export function focusFlag(l:Lead):string {if(l.tpv===null)return "TPV pendente"; if(l.tpv<100000||l.tpv>300000)return "Fora do foco 100k-300k";return "Foco 100k-300k"}
