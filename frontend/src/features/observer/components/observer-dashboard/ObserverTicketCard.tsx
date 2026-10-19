import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';
import { useObserverTickets } from '@src/features/observer/hooks/useObserverTickets';

import { CARD_INTERACTIVE, INFO_TEXT, STAT_ROW, STAT_VALUE, WARNING_TEXT } from './constants';

/**
 *
 */
export default function ObserverTicketCard() {
  const { tickets } = useObserverTickets();
  const critical = tickets.filter(t => t.severity === 'critical').length;
  const warning = tickets.filter(t => t.severity === 'warning').length;
  const info = tickets.filter(t => t.severity === 'info').length;
  const total = tickets.length;

  const scrollToQueue = () => {
    document.getElementById('ticket-queue')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={CARD_INTERACTIVE}>
      <Button type="button" onClick={scrollToQueue}>
        <Text as="h3" size="sm" weight="medium">Offene Tickets</Text>
        <div className={STAT_VALUE}>
          <Text as="p" weight="bold">
            {total} offen
          </Text>
        </div>
        <div className={STAT_ROW}>
          <Text as="span" color="error">{critical} critical</Text>
          <div className={WARNING_TEXT}>
            <Text as="span">{warning} warning</Text>
          </div>
          <div className={INFO_TEXT}>
            <Text as="span">{info} info</Text>
          </div>
        </div>
      </Button>
    </div>
  );
}
