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
export const REQUIRED = ["id","cliente","rota","agente","etapa","tpv","acao","data"] as const;
export type ImportResult = { header:string[]; count:number; errors:string[]; warnings:string[]; sample:Record<string,string>[] };
/** CSV validation is preview-only; no parsed rows are added to the pipeline. */
export function parseCsv(text:string): string[][] {
 const rows:string[][]=[]; let row:string[]=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++) { const c=text[i]; if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted} else if(c===','&&!quoted){row.push(cell);cell=""}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=""}else cell+=c; }
 if(quoted) throw new Error("Aspas não fechadas no CSV.");row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function previewCsv(text:string):ImportResult {
 const rows=parseCsv(text); const header=(rows[0]||[]).map(x=>x.trim().toLowerCase().replace(/^\ufeff/,''));
 const errors:string[]=[];const warnings:string[]=[];
 for(const key of REQUIRED)if(!header.includes(key))errors.push(`Coluna obrigatória ausente: ${key}`);
 if(new Set(header).size!==header.length)errors.push("Cabeçalhos duplicados.");
 const data=rows.slice(1);const ids=new Set<string>();
 data.forEach((r,i)=>{const line=i+2;if(r.length!==header.length)errors.push(`Linha ${line}: ${r.length} campos para ${header.length} colunas.`);
 const id=r[header.indexOf('id')]?.trim();if(id){if(ids.has(id))errors.push(`Linha ${line}: ID repetido (${id}).`);ids.add(id)}else if(header.includes('id'))errors.push(`Linha ${line}: ID vazio.`);
 const stage=r[header.indexOf('etapa')]?.trim();if(stage&&!STAGES.includes(stage as Stage))warnings.push(`Linha ${line}: etapa desconhecida (${stage}).`);
 const tpv=r[header.indexOf('tpv')]?.trim();if(tpv==="")warnings.push(`Linha ${line}: TPV vazio; manter ausente, não converter para zero.`); else if(tpv&&!/^(?:\d+)(?:[.,]\d{1,2})?$/.test(tpv))errors.push(`Linha ${line}: TPV inválido.`);
 });
 if(!data.length)warnings.push("Arquivo sem registros.");
 const sample=data.slice(0,3).map(r=>Object.fromEntries(header.map((h,j)=>[h,r[j]??""])));
 return {header,count:data.length,errors,warnings,sample};
}
export function filterLeads(leads:Lead[],stage:string,route:string,agent:string):Lead[]{return leads.filter(l=>(stage==='Todas'||l.stage===stage)&&(route==='Todas'||l.route===route)&&(agent==='Todos'||l.agent===agent))}
export function focusFlag(l:Lead):string {if(l.tpv===null)return "TPV pendente"; if(l.tpv<100000||l.tpv>300000)return "Fora do foco 100k-300k";return "Foco 100k-300k"}
