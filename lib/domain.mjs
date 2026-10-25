export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const emailOK = v => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
export const phoneOK = v => typeof v === 'string' && /^(?:\+33|0033|0)[1-9]\d{8}$/.test(v.replace(/[\s.()\-]/g, ''));
export const clean = (v, max = 200) => typeof v === 'string' ? v.trim().slice(0, max) : '';
export function normalizeContact(contact) {
  return contact.includes('@') ? contact.trim().toLowerCase() : contact.replace(/[\s.()\-]/g, '').replace(/^0033|^0/, '+33');
}
const fields = ['trade','department','employees','revenue','horizon','company','slot','message','ticket','profile','wealthShare','lastName'];
export function validateLead(body, { investorsEnabled = false, valuationEnabled = false } = {}) {
  if (!body || Array.isArray(body) || typeof body !== 'object') throw new HttpError(400, 'Demande invalide.');
  const kind = clean(body.kind);
  if (!['seller', 'diagnostic', 'valuation', 'investor', 'referrer'].includes(kind)) throw new HttpError(400, 'Parcours inconnu.');
  if (kind === 'investor' && !investorsEnabled) throw new HttpError(403, 'Ce parcours n’est pas encore ouvert.');
  if (kind === 'valuation' && !valuationEnabled) throw new HttpError(403, 'L’estimation n’est pas encore disponible.');
  const firstName = clean(body.firstName, 100), contact = clean(body.contact, 254);
  if (!firstName || !(emailOK(contact) || phoneOK(contact))) throw new HttpError(400, 'Indiquez votre prénom et un e-mail ou un téléphone valide.');
  if (kind === 'seller' && !['discovery', '1-3-years', 'this-year'].includes(body.horizon)) throw new HttpError(400, 'Précisez votre horizon de transmission.');
  if (kind === 'investor' && (body.ownAccount !== true || body.risksAccepted !== true || !body.ticket || !body.profile || !body.wealthShare)) throw new HttpError(400, 'Précisez votre profil, votre ticket et la part de patrimoine, puis confirmez les deux cases.');
  const details = {};
  for (const f of fields) if (typeof body[f] === 'string') details[f] = clean(body[f], f === 'message' ? 3000 : 200);
  if (kind === 'diagnostic') {
    if (!Number.isInteger(body.score) || body.score < 0 || body.score > 20) throw new HttpError(400, 'Terminez le diagnostic avant l’envoi.');
    details.score = body.score;
    if (body.shareDetails === true) {
      if (!Array.isArray(body.answers) || body.answers.length !== 10 || body.answers.some(x => ![0,1,2].includes(x)) || body.answers.reduce((a,b)=>a+b,0) !== body.score) throw new HttpError(400, 'Réponses du diagnostic invalides.');
      details.answers = body.answers;
    }
  }
  if (kind === 'valuation' && body.shareDetails === true) details.figures = validateFigures(body.figures);
  if (body.alternateContact) {
    const alternate=clean(body.alternateContact,254);
    if (!(emailOK(alternate)||phoneOK(alternate))) throw new HttpError(400, 'Le second contact est invalide.');
    details.alternateContact=normalizeContact(alternate);
  }
  const consent = { newsletter: body.newsletter === true, shareDetails: body.shareDetails === true };
  if (kind === 'investor') Object.assign(consent, { ownAccount: true, risksAccepted: true });
  return { kind, firstName, contact: normalizeContact(contact), details, consent, source: clean(body.source, 150), page: clean(body.page, 200) };
}
export function validateFigures(x) {
  const keys = ['revenue','ebe','remuneration','excessCash','debt'];
  if (!x || keys.some(k => !Number.isFinite(x[k]) || Math.abs(x[k]) > 99999999999 || (k !== 'ebe' && x[k] < 0))) throw new HttpError(400, 'Vérifiez les montants renseignés.');
  return Object.fromEntries(keys.map(k => [k, x[k]]));
}
export function valuationReady(v) {
  return !!(v?.approved === true && /^\d{4}-\d{2}-\d{2}$/.test(v.approvedAt || '') && Number.isFinite(v.replacementCostLoaded) && v.replacementCostLoaded >= 0 && v.cashPolicy === 'excess-only' && Object.keys(v.multiples || {}).length && Object.values(v.multiples).every(m => Array.isArray(m) && m.length === 2 && m.every(n => Number.isFinite(n) && n > 0) && m[0] <= m[1]));
}
export function estimate(figures, trade, rules) {
  const x = validateFigures(figures), m = rules.multiples?.[trade];
  if (!valuationReady(rules) || !m) throw new HttpError(400, 'L’estimation n’est pas disponible pour ce métier.');
  const adjusted = x.ebe + x.remuneration - rules.replacementCostLoaded;
  if (x.ebe <= 0 || adjusted <= 0) return { adjusted, low: null, high: null };
  const low=adjusted*m[0]+x.excessCash-x.debt, high=adjusted*m[1]+x.excessCash-x.debt;
  if (high <= 0) return { adjusted, low: null, high: null };
  return { adjusted, low: Math.max(0, low), high }; 
}
export const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function csvCell(v) {
  const x = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
  return '"' + (/^[=+\-@\t\r]/.test(x) ? "'" + x : x).replaceAll('"', '""') + '"';
}
