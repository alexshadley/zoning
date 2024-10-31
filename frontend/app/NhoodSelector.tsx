import { AllNhoods } from "./types";

export const NhoodSelector = ({
  selectedNhoods,
  toggleNhood,
  onSelectAll,
  onDeselectAll,
}: {
  selectedNhoods: string[];
  toggleNhood: (nhood: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) => {
  const sortedNhoods = [...AllNhoods].sort();
  return (
    <>
      <div className="text-lg">Enabled Neighborhoods</div>
      <div className="flex gap-2">
        <button className="px-2 py-1 rounded border" onClick={onSelectAll}>
          Select all
        </button>
        <button className="px-2 py-1 rounded border" onClick={onDeselectAll}>
          Clear all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {sortedNhoods.map((nhood) => (
          <div
            key={nhood}
            onClick={() => toggleNhood(nhood)}
            className={`flex gap-2 border px-2 py-1 rounded cursor-pointer`}
          >
            <input
              className="cursor-pointer"
              type="checkbox"
              id={`check-${nhood}`}
              checked={selectedNhoods.includes(nhood)}
              readOnly
            />
            {nhood}
          </div>
        ))}
      </div>
    </>
  );
};
