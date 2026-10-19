import type { PipelineActResult } from '@src/lib/api/aiscopeEndcustomer';

import Act1Data from './Act1Data';
import Act2Data from './Act2Data';
import Act3Data from './Act3Data';
import GenericActData from './GenericActData';

/** Dispatches the act-specific data renderer for a pipeline act. */
export default function ActData({ act }: { act: PipelineActResult }) {
  const data = act.data ?? {};
  switch (act.act) {
    case 1:
      return <Act1Data data={data} />;
    case 2:
      return <Act2Data data={data} />;
    case 3:
      return <Act3Data data={data} />;
    default:
      return <GenericActData data={data} />;
  }
}
