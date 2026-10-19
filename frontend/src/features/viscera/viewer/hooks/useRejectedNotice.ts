import { useCallback } from 'react';

import { api } from '@src/lib/api/axios';

import type { ObjectDetail } from './useObjectDetail';

// ── Types ────────────────────────────────────────────────────────────────────

interface RejectedNoticePayload {
  objectId: string;
  objectType: string;
  yamlFragment: string;
  reason: string;
  promptSuggestion: string;
  context: {
    diagram: string;
    edges: string[];
  };
}

interface RejectedNoticeResponse {
  noticeId: string;
  status: string;
}

export interface UseRejectedNoticeReturn {
  sendRejectedNotice: (
    detail: ObjectDetail,
    reason: string,
    promptSuggestion: string,
  ) => Promise<RejectedNoticeResponse>;
  isSending: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ENDPOINT = '/admin/llm/rejected-notice';

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook for sending a rejected-object notice to the LLM pipeline.
 *
 * Calls ``POST /api/v1/admin/llm/rejected-notice`` with the object
 * details, rejection reason, and optional prompt improvement suggestion.
 *
 * @returns ``sendRejectedNotice`` function and ``isSending`` state.
 */
export function useRejectedNotice(): UseRejectedNoticeReturn {
  const sendRejectedNotice = useCallback(
    async (
      detail: ObjectDetail,
      reason: string,
      promptSuggestion: string,
    ): Promise<RejectedNoticeResponse> => {
      // Build YAML fragment from the detail fields
      const yamlFields: Record<string, unknown> = {};
      detail.fields.forEach((field) => {
        yamlFields[field.field] = field.value;
      });

      const payload: RejectedNoticePayload = {
        objectId: detail.objectId ?? detail.name,
        objectType: detail.typeLabel,
        yamlFragment: JSON.stringify(
          {
            id: detail.objectId ?? detail.name,
            name: detail.name,
            type: detail.typeLabel,
            description: detail.description,
            technology: detail.technologies,
            ...yamlFields,
          },
          null,
          2,
        ),
        reason,
        promptSuggestion,
        context: {
          diagram: 'workspace.yml',
          edges: [],
        },
      };

      const response = await api.post<RejectedNoticeResponse>(ENDPOINT, payload);
      return response.data;
    },
    [],
  );

  return {
    sendRejectedNotice,
    isSending: false,
  };
}
