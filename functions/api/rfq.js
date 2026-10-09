// Cloudflare Pages Function. Configure RESEND_API_KEY and RFQ_FROM_EMAIL in Pages secrets.
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const clean=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
export async function onRequestPost({request,env}){
  if(!env.RESEND_API_KEY||!env.RFQ_FROM_EMAIL)return json({error:'Email service not configured yet.'},503);
  const origin=request.headers.get('Origin');const host=new URL(request.url).host;
  if(origin){try{if(new URL(origin).host!==host)return json({error:'Invalid request origin.'},403)}catch{return json({error:'Invalid origin.'},403)}}
  if(Number(request.headers.get('Content-Length')||0)>12000)return json({error:'Request too large.'},413);
  let body;try{body=await request.json()}catch{return json({error:'Invalid JSON.'},400)}
  if(!body||typeof body!=='object')return json({error:'Invalid data.'},400);
  if(clean(body.website,200))return json({ok:true,reference:'RECEIVED'});
  const fields={buyer:clean(body.buyer,100),company:clean(body.company,150),email:clean(body.email,200),whatsapp:clean(body.whatsapp,70),country:clean(body.country,80),quantity:clean(body.quantity,80),port:clean(body.port,100),reference:clean(body.reference,120),part:clean(body.part,120),message:clean(body.message,2500)};
  if(!fields.buyer||!fields.company||!fields.email||!fields.country||!fields.quantity||!fields.part||!fields.message)return json({error:'Please complete all required fields.'},400);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))return json({error:'Invalid email address.'},400);
  const id='ONTEE-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
  const text=['New Ontee website RFQ','Reference: '+id,...Object.entries(fields).map(([k,v])=>k.toUpperCase()+': '+v)].join('\n\n');
  let reply;try{reply=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.RFQ_FROM_EMAIL,to:['onteeinnovate@gmail.com'],reply_to:fields.email,subject:'Ontee Website RFQ '+id+' — '+fields.part,text})})}catch{return json({error:'Mail provider unavailable; please use email fallback.'},502)}
  if(!reply.ok){console.error('Resend error',reply.status);return json({error:'Email delivery not available. Please use email fallback.'},502)}
  return json({ok:true,reference:id});
}
