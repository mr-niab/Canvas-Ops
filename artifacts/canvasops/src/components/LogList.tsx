import { useAppContext } from '../AppContext';

export function LogList() {
  const { logEntries } = useAppContext();
  return (
    <>
      {logEntries.map(entry => {
        const [date, time] = entry.date.split(' · ');
        return (
          <div className="log-row" key={entry.id}>
            <div className="log-date">{date}{time ? <><br />{time}</> : null}</div>
            <div className="log-actor">{entry.actor}</div>
            <div><span className={`badge ${entry.typeClass}`}>{entry.type}</span></div>
            <div className="log-detail">{entry.detail}</div>
          </div>
        );
      })}
    </>
  );
}
