import type { ZineProject, ZinePage } from '@/types';
import { useTemplatesStore } from '@/stores/templates';
import { text, textC, image } from './common';

const ICON_DOOR_WARRANT = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><rect x="20" y="14" width="52" height="72" rx="2" fill="none" stroke="#111" stroke-width="3"/><circle cx="64" cy="50" r="3" fill="#111"/><rect x="76" y="24" width="16" height="24" rx="2" fill="none" stroke="#111" stroke-width="3"/><path d="M78 28h12M78 34h8M78 40h12" stroke="#111" stroke-width="3"/></svg>`);
const ICON_ID_CARD = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><rect x="16" y="28" width="78" height="44" rx="6" fill="none" stroke="#111" stroke-width="3"/><circle cx="40" cy="50" r="8" fill="none" stroke="#111" stroke-width="3"/><path d="M30 62c6-6 14-6 20 0" stroke="#111" stroke-width="3" fill="none"/><path d="M58 44h28M58 52h22M58 60h18" stroke="#111" stroke-width="3"/></svg>`);
const ICON_PHONE_ALERT = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><rect x="34" y="12" width="42" height="76" rx="8" fill="none" stroke="#111" stroke-width="3"/><circle cx="55" cy="74" r="3" fill="#111"/><path d="M45 28h20v20H45z" fill="none" stroke="#111" stroke-width="3"/><path d="M55 30v12" stroke="#111" stroke-width="3"/><circle cx="55" cy="46" r="1.8" fill="#111"/></svg>`);
const ICON_CAMERA = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><rect x="18" y="34" width="74" height="42" rx="6" fill="none" stroke="#111" stroke-width="3"/><path d="M30 34l6-8h20l6 8" stroke="#111" stroke-width="3" fill="none"/><circle cx="55" cy="56" r="12" fill="none" stroke="#111" stroke-width="3"/><circle cx="55" cy="56" r="4" fill="#111"/></svg>`);
const ICON_BUILDING_MAP = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><path d="M22 64l20-8 26 8 20-8v18l-20 8-26-8-20 8z" fill="none" stroke="#111" stroke-width="3"/><rect x="24" y="20" width="24" height="34" fill="none" stroke="#111" stroke-width="3"/><rect x="62" y="28" width="24" height="26" fill="none" stroke="#111" stroke-width="3"/><circle cx="50" cy="32" r="2" fill="#111"/><circle cx="74" cy="36" r="2" fill="#111"/></svg>`);
const ICON_GROUP_SUPPORT = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><circle cx="36" cy="38" r="8" fill="#111"/><circle cx="74" cy="38" r="8" fill="#111"/><circle cx="55" cy="30" r="8" fill="#111"/><path d="M20 68c0-10 8-18 18-18h6c10 0 18 8 18 18M48 68c0-10 7-18 17-18h7c10 0 18 8 18 18" stroke="#111" stroke-width="3" fill="none"/></svg>`);
const ICON_CAUTION = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><path d="M55 16l38 66H17L55 16z" fill="none" stroke="#111" stroke-width="3"/><path d="M55 38v26" stroke="#111" stroke-width="3"/><circle cx="55" cy="70" r="3" fill="#111"/></svg>`);

export function buildIceKyrMini(): ZineProject {
  const templates = useTemplatesStore();
  const tpl = templates.getTemplate('quarter-fold-letter')!;
  const W = 198, H = 306;
  const pages: ZinePage[] = [];

  pages.push({ id: 'ice-p1', pageNumber: 1, title: 'Front Cover', backgroundColor: '#ffffff', content: [
    textC('p1-h', 10, 12, W-20, 32, 'ICE: Know Your Rights', 20, 'bold', '#0EA5E9'),
    text('p1-s', 10, 40, W-20, 22, 'Pocket guide for immigrants & allies', 13),
    image('p1-i', (W-110)/2, 66, 110, 80, ICON_GROUP_SUPPORT, 'Community support'),
    text('p1-f', 10, H-36, W-20, 26, 'This is general info, not legal advice.', 11)
  ]});

  pages.push({ id: 'ice-p2', pageNumber: 2, title: 'Home Knock', backgroundColor: '#ffffff', content: [
    textC('p2-h', 10, 10, W-20, 24, 'If ICE is at your door', 16, 'bold', '#0EA5E9'),
    image('p2-i', (W-110)/2, 36, 110, 80, ICON_DOOR_WARRANT, 'Door & warrant'),
    text('p2-b', 10, 120, W-20, H-130, '• Keep the door closed. Ask them to slide any papers under the door or hold them to the window.\n• Do NOT consent to entry. Say: “I do not consent to your entry.”\n• They need a judicial warrant (signed by a judge) to enter without consent.\n• You have the right to remain silent and to ask for an interpreter.\n• Do not sign anything you do not understand or agree with.', 13)
  ]});

  pages.push({ id: 'ice-p3', pageNumber: 3, title: 'Warrants', backgroundColor: '#ffffff', content: [
    textC('p3-h', 10, 10, W-20, 24, 'Warrants 101', 16, 'bold', '#0EA5E9'),
    image('p3-i', (W-110)/2, 36, 110, 80, ICON_ID_CARD, 'ID & warrant checks'),
    text('p3-b', 10, 120, W-20, H-130, '• A judicial warrant (court-signed) may say “U.S. District Court” or a state court and lists address/areas to search.\n• ICE “administrative warrants” (Forms I-200/I-205) are not signed by a judge and do NOT authorize home entry without consent.\n• Verify name/address match. If not correct, you do not have to let them in.', 13)
  ]});

  pages.push({ id: 'ice-p4', pageNumber: 4, title: 'Public & Work', backgroundColor: '#ffffff', content: [
    textC('p4-h', 10, 10, W-20, 24, 'In Public & at Work', 16, 'bold', '#0EA5E9'),
    image('p4-i', (W-110)/2, 36, 110, 80, ICON_BUILDING_MAP, 'Public/workplace'),
    text('p4-b', 10, 120, W-20, H-130, 'In public:\n• You can decline questions (say: “I choose to remain silent”).\n• You generally have the right to record from public places without interfering.\n\nAt work:\n• Agents may enter public areas; private/non-public areas require a judicial warrant or employer consent.\n• Direct agents to a public area and request to see any judicial warrant.', 13)
  ]});

  pages.push({ id: 'ice-p5', pageNumber: 5, title: 'Prepare', backgroundColor: '#ffffff', content: [
    textC('p5-h', 10, 10, W-20, 24, 'Prepare & Reduce Risk', 16, 'bold', '#0EA5E9'),
    image('p5-i', (W-110)/2, 36, 110, 80, ICON_CAUTION, 'Caution'),
    text('p5-b', 10, 120, W-20, H-130, '• Make a family/emergency plan; memorize key numbers.\n• Keep copies of important documents in a safe place.\n• Know your A-Number (if any). Share it with a trusted contact.\n• Carry a “Know Your Rights” card. Ask for a lawyer.\n• Do not lie or provide false documents. Do not run or resist.', 13)
  ]});

  pages.push({ id: 'ice-p6', pageNumber: 6, title: 'Report', backgroundColor: '#ffffff', content: [
    textC('p6-h', 10, 10, W-20, 24, 'Report & Get Help', 16, 'bold', '#0EA5E9'),
    image('p6-i', (W-110)/2, 36, 110, 80, ICON_PHONE_ALERT, 'Hotlines'),
    text('p6-b', 10, 120, W-20, H-130, '• Local rapid-response network / immigrant rights group (add your city hotline).\n• United We Dream MigraWatch hotline to report ICE/CBP activity.\n• Contact a licensed immigration attorney or legal aid.\n• You can file civil rights complaints with DHS (see back).', 13)
  ]});

  pages.push({ id: 'ice-p7', pageNumber: 7, title: 'Document', backgroundColor: '#ffffff', content: [
    textC('p7-h', 10, 10, W-20, 24, 'Document Safely', 16, 'bold', '#0EA5E9'),
    image('p7-i', (W-110)/2, 36, 110, 80, ICON_CAMERA, 'Camera/record'),
    text('p7-b', 10, 120, W-20, H-130, '• From public places, you can generally record without interfering.\n• Note date, time, location, badges, vehicles (plates), what was said/done.\n• Back up videos/photos. Share with trusted legal/community orgs.\n• Avoid posting details that expose vulnerable people.', 13)
  ]});

  pages.push({ id: 'ice-p8', pageNumber: 8, title: 'Back Cover', backgroundColor: '#ffffff', content: [
    textC('p8-h', 10, 10, W-20, 24, 'Resources & Complaints', 16, 'bold', '#0EA5E9'),
    text('p8-r', 10, 36, W-20, 120, '• ACLU — Immigrants’ Rights & ICE at your door\n• NILC — Know Your Rights & employer guides\n• United We Dream — Deportation Defense / MigraWatch\n• File civil rights complaints: DHS Office for Civil Rights & Civil Liberties; DHS OIG Hotline\n\nLaws vary by state. Consult a licensed attorney for legal advice.', 12),
    text('p8-f', 10, H-30, W-20, 20, 'Open source. Copy, share, remix.', 12)
  ]});

  return {
    id: `sample-ice-kyr-${Date.now()}`,
    name: 'ICE: Know Your Rights',
    template: tpl,
    pages,
    createdAt: new Date(),
    modifiedAt: new Date(),
    metadata: { author: 'Sample', description: 'Pocket KYR guide for ICE encounters', tags: ['sample','immigration','kyr','ice'] },
    formatVersion: 2
  };
}

export const THUMB_ICE = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="240" height="150" viewBox="0 0 240 150"><rect width="240" height="150" fill="#fff"/><text x="18" y="34" font-family="Arial" font-size="18" font-weight="bold" fill="#111">ICE: Know Your Rights</text><rect x="18" y="46" width="64" height="44" rx="8" fill="none" stroke="#111" stroke-width="3"/><rect x="100" y="46" width="120" height="44" rx="8" fill="none" stroke="#111" stroke-width="3"/><path d="M18 112h202" stroke="#0ea5e9" stroke-width="2" opacity="0.7"/></svg>`);


