import type { ZineProject, ZinePage } from '@/types';
import { useTemplatesStore } from '@/stores/templates';
import { text, textC, image } from './common';

const ICON_SHIELD = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><path d="M55 10l34 12v26c0 22-15 36-34 42-19-6-34-20-34-42V22l34-12z" fill="none" stroke="#111" stroke-width="3"/></svg>`);
const ICON_PHONE_LOCK = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><rect x="34" y="12" width="42" height="76" rx="8" fill="none" stroke="#111" stroke-width="3"/><circle cx="55" cy="74" r="3" fill="#111"/><rect x="42" y="38" width="26" height="22" rx="4" fill="none" stroke="#111" stroke-width="3"/><path d="M48 38v-5a7 7 0 0 1 14 0v5" fill="none" stroke="#111" stroke-width="3"/></svg>`);
const ICON_KEY = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><circle cx="38" cy="50" r="16" fill="none" stroke="#111" stroke-width="3"/><circle cx="38" cy="50" r="5" fill="#111"/><path d="M52 50h18l6 6h8" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`);
const ICON_CHAT = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><rect x="16" y="20" width="78" height="46" rx="8" fill="none" stroke="#111" stroke-width="3"/><path d="M32 66l-4 14 16-12" stroke="#111" stroke-width="3" fill="none" stroke-linejoin="round"/><circle cx="38" cy="44" r="3" fill="#111"/><circle cx="55" cy="44" r="3" fill="#111"/><circle cx="72" cy="44" r="3" fill="#111"/></svg>`);
const ICON_WALK = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><circle cx="58" cy="22" r="8" fill="#111"/><path d="M58 30l-10 16-8 14M58 30l12 16 8 20M40 60l-12 16M78 66l10 14" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`);
const ICON_ALERT = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><path d="M55 14l40 72H15L55 14z" fill="none" stroke="#111" stroke-width="3"/><path d="M55 38v28" stroke="#111" stroke-width="3"/><circle cx="55" cy="72" r="3" fill="#111"/></svg>`);
const ICON_LINKS = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><path d="M44 40h22" stroke="#111" stroke-width="3"/><rect x="18" y="28" width="30" height="20" rx="6" fill="none" stroke="#111" stroke-width="3"/><rect x="62" y="52" width="30" height="20" rx="6" fill="none" stroke="#111" stroke-width="3"/><path d="M44 60h22" stroke="#111" stroke-width="3"/></svg>`);

export function buildOpsecMini(): ZineProject {
  const templates = useTemplatesStore();
  const tpl = templates.getTemplate('quarter-fold-letter')!;
  const W = 198, H = 306;
  const pages: ZinePage[] = [];

  pages.push({ id: 'opsec-p1', pageNumber: 1, title: 'Front Cover', backgroundColor: '#ffffff', content: [
    textC('p1-h', 10, 12, W-20, 32, 'OPSEC Field Guide', 20, 'bold', '#10B981'),
    text('p1-s', 10, 40, W-20, 22, 'Pocket zine for activists & organizers', 13),
    image('p1-i', (W-110)/2, 66, 110, 80, ICON_SHIELD, 'Shield icon'),
    text('p1-f', 10, H-36, W-20, 26, 'Version 1.0 · Copy, remix, share', 12)
  ]});

  pages.push({ id: 'opsec-p2', pageNumber: 2, title: 'Threat Model', backgroundColor: '#ffffff', content: [
    textC('p2-h', 10, 10, W-20, 24, 'Threat Model Quickstart', 16, 'bold', '#10B981'),
    text('p2-b', 10, 36, W-20, H-46, 'Ask:\n• Who could realistically target me/us?\n• What do they want? (data, access, identities)\n• What happens if they succeed? (harm level)\n• How likely is it?\n• What controls reduce risk now?\n\nWrite answers. Revisit monthly or after incidents.', 13)
  ]});

  pages.push({ id: 'opsec-p3', pageNumber: 3, title: 'Devices', backgroundColor: '#ffffff', content: [
    textC('p3-h', 10, 10, W-20, 24, 'Phone & Device Hygiene', 16, 'bold', '#10B981'),
    image('p3-i', (W-110)/2, 34, 110, 80, ICON_PHONE_LOCK, 'Phone with lock'),
    text('p3-b', 10, 118, W-20, H-128, '• Keep OS/apps updated; uninstall unused apps.\n• Use strong screen lock (PIN/phrase). Disable biometrics where compelled unlock is a risk.\n• Separate roles: personal vs organizing devices/accounts.\n• Backups: encrypted, tested restores.\n• Consider hardened Android (e.g., GrapheneOS on Pixel) if feasible.', 13)
  ]});

  pages.push({ id: 'opsec-p4', pageNumber: 4, title: 'Auth', backgroundColor: '#ffffff', content: [
    textC('p4-h', 10, 10, W-20, 24, 'Passwords & 2FA', 16, 'bold', '#10B981'),
    image('p4-i', (W-110)/2, 34, 110, 80, ICON_KEY, 'Key icon'),
    text('p4-b', 10, 118, W-20, H-128, '• Use a password manager (Bitwarden, 1Password).\n• Unique passphrase per site.\n• Prefer app/hardware 2FA (Aegis, YubiKey). Avoid SMS 2FA when possible.\n• Store recovery codes offline. Rotate credentials after incidents.', 13)
  ]});

  pages.push({ id: 'opsec-p5', pageNumber: 5, title: 'Messaging', backgroundColor: '#ffffff', content: [
    textC('p5-h', 10, 10, W-20, 24, 'Private Messaging & Metadata', 16, 'bold', '#10B981'),
    image('p5-i', (W-110)/2, 34, 110, 80, ICON_CHAT, 'Chat bubbles'),
    text('p5-b', 10, 118, W-20, H-128, '• Prefer end-to-end encrypted apps (Signal). Consider Session for pseudonymous use.\n• Auto-delete sensitive threads.\n• Turn off cloud backups for encrypted chats.\n• Assume metadata exists (who/when). Reduce it: smaller groups, minimal admin lists.', 13)
  ]});

  pages.push({ id: 'opsec-p6', pageNumber: 6, title: 'Movement', backgroundColor: '#ffffff', content: [
    textC('p6-h', 10, 10, W-20, 24, 'On the Move (Actions & Travel)', 16, 'bold', '#10B981'),
    image('p6-i', (W-110)/2, 34, 110, 80, ICON_WALK, 'Walking figure'),
    text('p6-b', 10, 118, W-20, H-128, '• Airplane mode + disable biometrics before risky checkpoints.\n• Use eSIMs or vetted SIMs; avoid ad-hoc kiosk SIMs.\n• Minimize device contents when crossing borders.\n• Share location only when necessary, time-bound, to trusted contacts.', 13)
  ]});

  pages.push({ id: 'opsec-p7', pageNumber: 7, title: 'Incidents', backgroundColor: '#ffffff', content: [
    textC('p7-h', 10, 10, W-20, 24, 'Incident Response', 16, 'bold', '#10B981'),
    image('p7-i', (W-110)/2, 34, 110, 80, ICON_ALERT, 'Alert triangle'),
    text('p7-b', 10, 118, W-20, H-128, 'If device is seized or account compromised:\n1) Record what happened (time, place, who, what).\n2) Rotate passwords and revoke sessions.\n3) Notify your group with clear next steps.\n4) Assume data accessed; adjust plans.\n5) Debrief, update threat model, practice recovery.', 13)
  ]});

  pages.push({ id: 'opsec-p8', pageNumber: 8, title: 'Back Cover', backgroundColor: '#ffffff', content: [
    textC('p8-h', 10, 10, W-20, 24, 'Keep Practicing', 16, 'bold', '#10B981'),
    image('p8-i', (W-110)/2, 36, 110, 80, ICON_LINKS, 'Linked cards'),
    text('p8-r', 10, 120, W-20, 110, 'Resources:\n• EFF — Surveillance Self-Defense\n• Tactical Tech — Data Detox Kit\n• PrivacyGuides.org\n• Consumer Reports — Security Planner\n\nThis zine is open source. Copy it, share it, remix it.', 12),
    text('p8-f', 10, H-30, W-20, 20, 'Made by organizers, for organizers.', 12)
  ]});

  return {
    id: `sample-opsec-${Date.now()}`,
    name: 'OPSEC Field Guide',
    template: tpl,
    pages,
    createdAt: new Date(),
    modifiedAt: new Date(),
    metadata: { author: 'Sample', description: 'Pocket-size digital safety guide for activists & organizers', tags: ['sample','security','opsec'] },
    formatVersion: 2
  };
}

export const THUMB_OPSEC = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="240" height="150" viewBox="0 0 240 150"><rect width="240" height="150" fill="#fff"/><text x="18" y="34" font-family="Arial" font-size="18" font-weight="bold" fill="#111">OPSEC Field Guide</text><rect x="18" y="46" width="64" height="44" rx="8" fill="none" stroke="#111" stroke-width="3"/><rect x="100" y="46" width="120" height="44" rx="8" fill="none" stroke="#111" stroke-width="3"/><path d="M18 112h202" stroke="#10b981" stroke-width="2" opacity="0.7"/></svg>`);


