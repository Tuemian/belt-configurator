import { useMemo, useState } from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';
import { ConveyorConfig } from '@/lib/configurator-types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AssistantResponse, localAssistantFallback, sanitizeSuggestions } from '@/lib/configurator-assistant';

interface Props {
  config: ConveyorConfig;
  lang: 'de' | 'en';
  onApplySuggestions: (updates: Partial<ConveyorConfig>) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  suggestions?: Partial<ConveyorConfig>;
}

export function ConfiguratorAssistant({ config, lang, onApplySuggestions }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const placeholder = lang === 'de'
    ? 'z. B. Ich habe wenig Platz, 40 kg Last und möchte möglichst leise fahren.'
    : 'e.g. I have limited space, 40 kg payload, and prefer quiet operation.';

  const intro = useMemo(() => {
    return lang === 'de'
      ? 'Ich beantworte Fragen und schlage konkrete Werte vor. Optional kannst du Vorschläge direkt übernehmen.'
      : 'I answer questions and can suggest concrete values. You can apply suggestions directly.';
  }, [lang]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) {
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, config, lang }),
      });

      if (!response.ok) {
        let backendMessage = '';
        try {
          const errJson = await response.json() as { error?: string; details?: string };
          backendMessage = errJson.details || errJson.error || '';
        } catch {
          backendMessage = '';
        }
        throw new Error(backendMessage || 'assistant_api_error');
      }

      const json = (await response.json()) as AssistantResponse;
      const cleanSuggestions = sanitizeSuggestions(json.suggestions, config);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: json.answer || (lang === 'de' ? 'Keine Antwort erhalten.' : 'No answer received.'),
          suggestions: cleanSuggestions ?? undefined,
        },
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const shouldUseLocalFallback = !msg || msg === 'assistant_api_error' || msg.includes('Failed to fetch');

      const local = shouldUseLocalFallback
        ? localAssistantFallback(text, lang)
        : {
            answer: lang === 'de'
              ? `Serverfehler: ${msg}`
              : `Server error: ${msg}`,
          };

      const cleanSuggestions = sanitizeSuggestions(local.suggestions, config);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: local.answer,
          suggestions: cleanSuggestions ?? undefined,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-20 right-6 z-40 gap-2 shadow-lg" size="sm">
          <MessageCircle className="h-4 w-4" />
          {lang === 'de' ? 'KI-Hilfe' : 'AI Help'}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[92vw] sm:w-[560px] sm:max-w-none flex h-full flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {lang === 'de' ? 'Konfigurator-Assistent' : 'Configurator Assistant'}
          </SheetTitle>
          <SheetDescription>{intro}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto rounded-md border bg-muted/20 p-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {lang === 'de'
                ? 'Frag mich z. B.: Welche Konfiguration ist gut für wenig Platz und 50 kg Zuladung?'
                : 'Ask me e.g.: Which setup is good for limited space and 50 kg payload?'}
            </p>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={
                  msg.role === 'user'
                    ? 'inline-block rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                    : 'inline-block max-w-[95%] rounded-lg bg-background px-3 py-2 text-sm border'
                }
              >
                {msg.text}
              </div>

              {msg.role === 'assistant' && msg.suggestions && (
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onApplySuggestions(msg.suggestions!)}
                  >
                    {lang === 'de' ? 'Vorschlag übernehmen' : 'Apply suggestion'}
                  </Button>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <p className="text-sm text-muted-foreground">
              {lang === 'de' ? 'KI denkt nach...' : 'AI is thinking...'}
            </p>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="min-h-[88px]"
          />
          <div className="flex justify-end">
            <Button onClick={send} disabled={loading || input.trim().length === 0}>
              {lang === 'de' ? 'Senden' : 'Send'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
