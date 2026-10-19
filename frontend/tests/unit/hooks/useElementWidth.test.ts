/**
 * Tests: useElementWidth (exported as useElementSize) – ResizeObserver-based
 * width/height measurement.
 *
 * ResizeObserver and clientWidth/clientHeight are the browser boundary and are
 * faked; the rendered size string is the public contract.
 */
import { createElement } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useElementSize } from '@src/hooks/useElementWidth';

interface ObserverInstance {
  callback: ResizeObserverCallback
  observed: Element[]
  disconnected: boolean
}

const observers: ObserverInstance[] = [];
let width = 0;
let height = 0;

class FakeResizeObserver {
  private readonly instance: ObserverInstance;

  constructor(callback: ResizeObserverCallback) {
    this.instance = { callback, observed: [], disconnected: false };
    observers.push(this.instance);
  }

  observe(element: Element): void {
    this.instance.observed.push(element);
  }

  disconnect(): void {
    this.instance.disconnected = true;
    this.instance.observed.length = 0;
  }
}

function Probe() {
  const [ref, size] = useElementSize<HTMLDivElement>();

  return createElement('div', { ref, 'data-testid': 'box' }, `${size.width}x${size.height}`);
}

describe('useElementSize', () => {
  beforeEach(() => {
    observers.length = 0;
    width = 320;
    height = 180;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => width,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => height,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
    Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
  });

  it('measures the element immediately after mount', () => {
    render(createElement(Probe));

    expect(screen.getByTestId('box').textContent).toBe('320x180');
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toHaveLength(1);
  });

  it('updates the size when the observer reports a resize', () => {
    render(createElement(Probe));
    width = 500;
    height = 250;
    const observer = observers[0];

    act(() => {
      observer.callback([], observer as unknown as ResizeObserver);
    });

    expect(screen.getByTestId('box').textContent).toBe('500x250');
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(createElement(Probe));

    unmount();

    expect(observers[0].disconnected).toBe(true);
  });

  it('starts with a zero size object', () => {
    width = 0;
    height = 0;

    render(createElement(Probe));

    expect(screen.getByTestId('box').textContent).toBe('0x0');
  });
});
