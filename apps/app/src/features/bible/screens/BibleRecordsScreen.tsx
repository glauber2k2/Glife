// Registros da Bíblia (protótipo Bíblia v2): tudo o que a pessoa grifou, sublinhou ou anotou, agrupado por período.
// O texto original nunca muda: são camadas suas.
import { useState } from 'react';

import { BackHeader, EmptyState, ListGroup, Screen, Section } from '@/shared/ui';

import { RecordFilter } from '../components/RecordFilter';
import { RecordRow } from '../components/RecordRow';
import { RECORD_BUCKETS, recordBucket } from '../components/recordGroups';
import { openRecord } from '../components/openRecord';
import { useBibleRecords, type RecordFilter as Filter } from '../hooks/useBibleRecords';

export function BibleRecordsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const { records, counts, loading } = useBibleRecords(filter);
  const now = new Date();
  return (
    <Screen header={<BackHeader title="Registros" fallback="/biblia" backLabel="Bíblia" />}>
      <RecordFilter value={filter} onChange={setFilter} counts={counts} />
      {!loading && records.length === 0 && (
        <EmptyState compact message={filter === 'all' ? 'Nada aqui ainda. No leitor, toque num versículo para grifar, sublinhar ou anotar.' : 'Nenhum registro deste tipo.'} />
      )}
      {RECORD_BUCKETS.map((bucket) => {
        const list = records.filter((r) => recordBucket(r.at, now) === bucket);
        return list.length ? (
          <Section key={bucket} title={bucket}>
            <ListGroup>
              {list.map((r) => (
                <RecordRow key={`${r.kind}.${r.id}`} record={r} onPress={() => openRecord(r)} />
              ))}
            </ListGroup>
          </Section>
        ) : null;
      })}
    </Screen>
  );
}
