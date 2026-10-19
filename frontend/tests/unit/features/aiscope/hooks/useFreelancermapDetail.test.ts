/**
 * Tests: useFreelancermapDetail
 *
 * Prüft Success, Error und Loading-Zustände.
 * Der Hook wird über die renderHook-API getestet.
 *
 * Die Service-Funktion wird auf Modulebene gemockt, da MSW
 * (Mock Service Worker) sonst die Requests abfängt.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProjectFreelancerMap } from '@src/lib/api/aiscope'

// Module-level mock – Factory wird hoisted, daher inline
const mockProject: ProjectFreelancerMap = {
  id: 42,
  external_id: 'ext-42',
  url: 'https://example.com/42',
  title: 'Senior React Developer',
  description: '### Aufgaben\n\nReact-Entwicklung',
  agency: 'Agency A',
  contact_name: 'Max Mustermann',
  city: 'Berlin',
  country: 'DE',
  remote_percent: 100,
  contract_type: 'contracting',
  duration: 6,
  start_date: '06/2026',
  skills: ['React', 'TypeScript'],
  industry: null,
  extension_possible: null,
  endcustomer: null,
  search_term_id: null,
  search_term_name: 'frontend',
  posted_at: '2026-04-20T10:00:00Z',
  scraped_at: '2026-04-27T08:00:00Z',
  mapped_at: null,
}

// Must be imported AFTER vi.mock calls
import * as adminService from '@src/lib/api/aiscope'
import { useFreelancermapDetail } from '@src/features/aiscope/hooks/useFreelancermapDetail'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

vi.mock('@src/lib/api/aiscope', () => ({
  fetchFreelancermapProject: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFreelancermapDetail', () => {
  it('returns project and fields on success', async () => {
    // Der Fake antwortet mit der angefragten Id – so ist die String→Number-
    // Konvertierung des Route-Params am Ergebnis beobachtbar.
    vi.mocked(adminService.fetchFreelancermapProject).mockImplementation(
      (id: number) => Promise.resolve({ ...mockProject, id }),
    )

    const { result } = renderHook(() => useFreelancermapDetail('42'))

    // Initial: loading
    expect(result.current.loading).toBe(true)
    expect(result.current.entity).toBeNull()
    expect(result.current.error).toBeNull()

    // Warten bis geladen
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.entity).toEqual(mockProject)
    expect(result.current.error).toBeNull()
    expect(result.current.fields.length).toBeGreaterThan(0)
    expect(result.current.fields[0]).toEqual({ kind: 'text', label: 'ID (intern)', value: '42' })
  })

  it('sets error when fetch fails', async () => {
    vi.mocked(adminService.fetchFreelancermapProject).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useFreelancermapDetail('42'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Projekt nicht gefunden.')
    expect(result.current.entity).toBeNull()
    expect(result.current.fields).toEqual([])
  })

  it('shows loading state initially', async () => {
    vi.mocked(adminService.fetchFreelancermapProject).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockProject), 100)),
    )

    const { result } = renderHook(() => useFreelancermapDetail('42'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('returns empty fields when project is null', async () => {
    // Ein Fetch bei fehlender Id wäre ein Fehler – der Fake macht ihn sichtbar.
    vi.mocked(adminService.fetchFreelancermapProject).mockImplementation(
      () => Promise.reject(new Error('unexpected fetch')),
    )

    const { result } = renderHook(() => useFreelancermapDetail(undefined))

    // Bei undefined id wird kein fetch ausgelöst – loading bleibt true
    expect(result.current.loading).toBe(true)
    expect(result.current.entity).toBeNull()
    expect(result.current.fields).toEqual([])
  })
})
