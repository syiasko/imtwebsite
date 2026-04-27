export default function SpecTable({ specs }) {
  const entries = Object.entries(specs || {});
  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        Spesifikasi belum tersedia.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-200">
          {entries.map(([key, value]) => (
            <tr key={key} className="odd:bg-slate-50">
              <th className="text-left font-medium text-slate-700 px-4 py-3 w-1/3 align-top">
                {key}
              </th>
              <td className="px-4 py-3 text-slate-900">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
