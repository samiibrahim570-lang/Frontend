import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, ChatTurn, apiErrorMessage } from '../../core/services/ai.service';
import { TenantService } from '../../core/services/tenant.service';

interface ChatBubble extends ChatTurn {
  html?: string;
  error?: boolean;
}

/**
 * Business Assistant chat. History lives only in this component (cleared on reload / company switch);
 * the server keeps no chat history, so one company's conversation can never reach another.
 */
@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.scss'
})
export class AssistantComponent implements OnInit, AfterViewChecked {
  private ai = inject(AiService);
  tenant = inject(TenantService);

  @ViewChild('scroller') private scroller?: ElementRef<HTMLDivElement>;
  private stickToBottom = false;

  messages = signal<ChatBubble[]>([]);
  input = '';
  busy = signal(false);

  /** 'ai' = Claude answers; 'rules' = basic mode (fixed questions, no API key needed). */
  mode = signal<'ai' | 'rules' | null>(null);
  suggestions = signal<string[]>([
    'Is mahine ki sale',
    'Udhaar 30 din se purana',
    'Low stock items',
    'Sab se zyada bikne wale items'
  ]);

  ngOnInit(): void {
    this.ai.status().subscribe({
      next: (s) => {
        this.mode.set(s.mode);
        if (s.quickQuestions?.length) this.suggestions.set(s.quickQuestions);
      },
      error: () => this.mode.set(null)
    });
  }

  send(text?: string): void {
    const message = (text ?? this.input).trim();
    if (!message || this.busy()) return;

    const history: ChatTurn[] = this.messages()
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, text: m.text }));

    this.messages.update((list) => [...list, { role: 'user', text: message }]);
    this.input = '';
    this.busy.set(true);
    this.stickToBottom = true;

    this.ai.chat(history, message).subscribe({
      next: (res) => {
        this.messages.update((list) => [...list, { role: 'assistant', text: res.reply, html: renderMarkdown(res.reply) }]);
        if (res.mode) this.mode.set(res.mode);
        this.busy.set(false);
        this.stickToBottom = true;
      },
      error: (err) => {
        const text = apiErrorMessage(err, 'Assistant is not available right now.');
        this.messages.update((list) => [...list, { role: 'assistant', text, html: escapeHtml(text), error: true }]);
        this.busy.set(false);
        this.stickToBottom = true;
      }
    });
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  clear(): void {
    this.messages.set([]);
  }

  ngAfterViewChecked(): void {
    if (this.stickToBottom && this.scroller) {
      const el = this.scroller.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.stickToBottom = false;
    }
  }
}

// ---------- tiny markdown renderer (bold, lists, tables, line breaks); input is escaped first ----------

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,!?])/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function renderMarkdown(src: string): string {
  const lines = escapeHtml(src).split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isRow = (l: string | undefined) => !!l && /^\s*\|.*\|\s*$/.test(l);
    if (isRow(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const body: string[][] = [];
      while (isRow(lines[i])) body.push(cells(lines[i++]));
      out.push(
        '<div class="md-table"><table><thead><tr>' + head.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>'
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(inline(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, '')));
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map((t) => `<li>${t}</li>`).join('') + `</${tag}>`);
      continue;
    }
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (heading) { out.push(`<p><strong>${inline(heading[1])}</strong></p>`); i++; continue; }
    if (line.trim() === '') { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !isRow(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i])) para.push(inline(lines[i++]));
    out.push(`<p>${para.join('<br>')}</p>`);
  }
  return out.join('');
}
