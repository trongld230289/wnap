import { useGuideI18n } from './useGuideI18n';
import type { UseCase } from './useCases';

export type GuideContentProps =
  | { kind: 'overview' }
  | { kind: 'useCase'; useCase: UseCase };

export function GuideContent(props: GuideContentProps) {
  const { t } = useGuideI18n();
  if (props.kind === 'overview') {
    return (
      <div
        data-testid="overview-placeholder"
        className="flex items-center justify-center min-h-[400px] text-muted-foreground"
      >
        Overview mindmap (Task 7)
      </div>
    );
  }
  const { useCase: uc } = props;
  return (
    <article className="space-y-6">
      <h2 className="text-2xl font-bold">{t(uc.titleKey)}</h2>
      <section>
        <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2">
          {t('guide.section.steps')}
        </h3>
        <ol className="list-decimal pl-6 space-y-1">
          {uc.stepKeys.map((k) => (
            <li key={k} data-testid="uc-step">
              {t(k)}
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-md bg-muted p-3" data-testid="uc-example">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-1">
          {t('guide.section.example')}
        </h3>
        <p>{t(uc.exampleKey)}</p>
      </section>
      <section className="rounded-md bg-amber-50 p-3">
        <h3 className="text-sm font-semibold uppercase text-amber-800 mb-1">
          {t('guide.section.tips')}
        </h3>
        <ul className="list-disc pl-6 space-y-1">
          {uc.tipKeys.map((k) => (
            <li key={k} data-testid="uc-tip">
              {t(k)}
            </li>
          ))}
        </ul>
      </section>
      {uc.refImage && (
        <img
          src={uc.refImage}
          alt=""
          loading="lazy"
          className="rounded-md border max-w-full"
        />
      )}
    </article>
  );
}
