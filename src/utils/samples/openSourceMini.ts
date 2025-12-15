import type { ZineProject, ZinePage } from '@/types';
import { useTemplatesStore } from '@/stores/templates';
import { text, textC, image } from './common';

const ICON_PRINT_BLOCKS = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="110" height="100" viewBox="0 0 110 100"><rect x="18" y="18" width="28" height="28" fill="#111"/><rect x="64" y="18" width="28" height="28" fill="#111"/><rect x="18" y="54" width="28" height="28" fill="#111"/><rect x="64" y="54" width="28" height="28" fill="#5CFF6A"/><path d="M18 18h74v64H18z" stroke="#111" fill="none" stroke-width="3"/></svg>`);

export function buildOpenSourceMini(): ZineProject {
  const templates = useTemplatesStore();
  const tpl = templates.getTemplate('quarter-fold-letter')!;
  const W = 198, H = 306;
  const pages: ZinePage[] = [];

  pages.push({ id: 'page-1', pageNumber: 1, title: 'Front Cover', backgroundColor: '#ffffff', content: [
    textC('h1', 10, 10, W-20, 30, 'Zines: Voices from the Underground', 18, 'bold', '#10B981'),
    text('t1', 10, 38, W-20, 22, 'Unfiltered. Uncensored. Unstoppable.', 13),
    image('i1', (W-110)/2, 62, 110, 80, ICON_PRINT_BLOCKS, 'Print blocks')
  ]});
  pages.push({ id: 'page-2', pageNumber: 2, title: 'What Are Zines?', backgroundColor: '#ffffff', content: [
    textC('h2', 10, 10, W-20, 24, 'What Are Zines?', 16, 'bold', '#10B981'),
    text('b2', 10, 36, W-20, H-46, 'Zines are self‑published, non‑commercial publications central to DIY culture. They share practical knowledge, art, and lived experience—often from communities ignored by mainstream media. Production is intentionally accessible: paper, glue sticks, photocopiers.', 13)
  ]});
  pages.push({ id: 'page-3', pageNumber: 3, title: 'A Brief History', backgroundColor: '#ffffff', content: [
    textC('h3', 10, 10, W-20, 24, 'A Brief History', 16, 'bold', '#10B981'),
    text('b3', 10, 36, W-20, H-46, '1930s sci‑fi fanzines built collaborative worlds; later, punk/DIY scenes and riot grrrl used zines for organizing and mutual aid. Contemporary zines continue that tradition: skill‑sharing, survival guides, and community archiving.', 13)
  ]});
  pages.push({ id: 'page-4', pageNumber: 4, title: 'Why Zines Matter', backgroundColor: '#ffffff', content: [
    textC('h4', 10, 10, W-20, 24, 'Why Zines Matter', 16, 'bold', '#10B981'),
    text('b4', 10, 36, W-20, H-46, 'They lower the barrier to speak, teach, and organize. Zines move person‑to‑person, build trust, and preserve context. They can be anonymized, duplicated, and adapted across regions without platform lock‑in.', 13)
  ]});
  pages.push({ id: 'page-5', pageNumber: 5, title: 'How to Create Your Own Zine', backgroundColor: '#ffffff', content: [
    textC('h5', 10, 10, W-20, 24, 'How to Create Your Own Zine', 16, 'bold', '#10B981'),
    text('b5', 10, 36, W-20, H-46, '• Pick a focus (know‑your‑rights, digital safety, mutual aid).\n• Draft short sections and visuals.\n• Choose a format (one‑sheet mini, half‑fold, booklet).\n• Test prints; leave margins for folds/cuts.\n• Share physically; mirror the PDF online as needed.', 13)
  ]});
  pages.push({ id: 'page-6', pageNumber: 6, title: 'Join the Zine Community', backgroundColor: '#ffffff', content: [
    textC('h6', 10, 10, W-20, 24, 'Join the Zine Community', 16, 'bold', '#10B981'),
    text('b6', 10, 36, W-20, H-46, 'Look for local zine libraries, workshops, and fests. Explore QZAP and ZineWiki to learn from past movements. Swap, remix, and translate—with attribution where possible.', 13)
  ]});
  pages.push({ id: 'page-7', pageNumber: 7, title: 'What You’ll Find', backgroundColor: '#ffffff', content: [
    text('h7', 10, 10, W-20, 24, 'What You’ll Find', 16, 'bold'),
    text('c7', 10, 36, W-20, H-46, 'Perzines (personal stories), artzines (visual work), fanzines (culture/critique), and practical guides (mutual aid, safety, DIY). Remix and translate freely where licensing allows.', 13)
  ]});
  pages.push({ id: 'page-8', pageNumber: 8, title: 'Back Cover', backgroundColor: '#ffffff', content: [
    textC('h8', 10, 10, W-20, 24, 'Join the Movement', 16, 'bold', '#10B981'),
    text('b8', 10, 36, W-20, 60, 'Embrace the DIY spirit—share your stories, art, and ideas. Zine culture thrives on collaboration, curiosity, and care.', 13),
    text('links8', 10, 100, W-20, 70, 'Explore more: QZAP (Queer Zine Archive Project), ZineWiki, local zine libraries & fests.', 12),
    text('f8', 10, H-30, W-20, 20, 'This zine is open source. Copy it, share it, remix it.', 12)
  ]});

  return {
    id: `sample-oss-${Date.now()}`,
    name: 'Zines: Voices from the Underground',
    template: tpl,
    pages,
    createdAt: new Date(),
    modifiedAt: new Date(),
    metadata: { author: 'Sample', description: 'A concise guide to zine culture', tags: ['sample','zines'] },
    formatVersion: 2
  };
}


