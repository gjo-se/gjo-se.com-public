import { useState } from 'react';

import Button from '@src/components/primitives/Button';
import Dialog, { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@src/components/primitives/Dialog';
import Input from '@src/components/primitives/Input';
import Separator from '@src/components/primitives/Separator';
import Text from '@src/components/primitives/Text';

import type { ScraperControlsProps } from './ScraperControls.types';

/** Scraper controls with max results input, scrape button, optional utility action, and confirmation modal. */
export default function ScraperControls({
  inputLabel,
  inputId,
  maxResults,
  onMaxResultsChange,
  scraperLabel,
  scraperDisabled,
  scraperVariant,
  onScrape,
  utilityAction,
  confirmModal,
}: ScraperControlsProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      {/* ── Scraper controls ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Text as="label" size="sm" color="muted">
          {inputLabel}
        </Text>
        <div className="basis-20">
          <Input
            id={inputId}
            type="number"
            min={1}
            max={500}
            value={maxResults}
            onChange={(e) => onMaxResultsChange(e.target.value)}
            placeholder="∞"
          />
        </div>
        <Button
          onClick={() => void onScrape()}
          disabled={scraperDisabled}
          variant={scraperVariant}
        >
          {scraperLabel}
        </Button>
      </div>

      <Separator spacing="mb-4" />

      {/* ── Utility actions ── */}
      <div className="flex flex-wrap items-center gap-4">
        {utilityAction && (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={utilityAction.disabled}
            size="sm"
            variant={utilityAction.variant}
          >
            {utilityAction.label}
          </Button>
        )}
      </div>

      {confirmModal && (
        <Dialog open={showConfirm} onOpenChange={(open) => !open && setShowConfirm(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmModal.title}</DialogTitle>
            </DialogHeader>
            <Text as="p" size="sm" color="error">
              {confirmModal.description}
            </Text>
            <DialogFooter>
              <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => { await confirmModal.onConfirm(); setShowConfirm(false); }}
                disabled={confirmModal.confirmDisabled}
              >
                {confirmModal.confirmDisabled ? 'Läuft…' : 'Trotzdem ausführen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
