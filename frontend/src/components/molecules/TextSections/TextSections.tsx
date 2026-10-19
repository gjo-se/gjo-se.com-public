import { Fragment } from 'react';

import Text from '@src/components/primitives/Text';

import ContentElementHeader from '../ContentElementHeader/ContentElementHeader';

export interface TextSection {
  title: string
  body: string
}
export interface TextSectionsProps {
  sections: TextSection[]
}

/**
 * TextSections – Generischer Abschnitts-Renderer für Text-Inhalte mit h2-Überschriften.
 * Nutzbar für Impressum, Datenschutz, AGB und ähnliche Seiten.
 * No className prop – Styling exclusively via Props.
 *
 * @example
 * <TextSections sections={[
 *   { title: 'Angaben gemäß § 5 TMG', body: 'Gregory Erdmann\nMusterstraße 1\n12345 Musterstadt' },
 *   { title: 'Kontakt', body: 'E-Mail: hi@gjo-se.com' },
 * ]} />
 */
export default function TextSections({ sections }: TextSectionsProps) {
  return (
    <>
      {sections.map(({ title, body }, i) => (
        <div key={title} className={i > 0 ? 'mt-10' : ''}>
          <ContentElementHeader title={title} />
          <Text color="secondary">
            {body.split('\n').map((line, j) => (
              <Fragment key={`${title}-${line}`}>
                {j > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </Text>
        </div>
      ))}
    </>
  );
}
