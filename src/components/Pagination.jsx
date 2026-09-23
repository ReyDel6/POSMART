//File: components/Pagination.jsx

export default function Pagination({
    currentPage = 1,
    totalPage = 1,
    totalData = 0,
    currentCount = 0,
    onPageChange = () => { }
}) {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between border-t border-slate-200 mt-10">
            <p>
                Menampilkan <span>{currentCount || 0}</span> dari{" "}
                <span className="font-bold text-slate-800">{totalData}</span>
            </p>
            <div className="flex items-center gap-1.5">
                {/* prev page */}
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    sebelumnya
                </button>

                {/* array button page */}
                {Array.from({ length: totalPage }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                        <button
                            key={pageNumber}
                            onClick={() => onPageChange(pageNumber)}
                            className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors cursor-pointer ${currentPage === pageNumber
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {pageNumber}
                        </button>
                    );
                })}

                {/* next page */}
                <button
                    disabled={currentPage === totalPage}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:lg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    selanjutnya
                </button>
            </div>
        </div>
    );
}