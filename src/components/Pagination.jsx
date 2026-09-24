//File: components/Pagination.jsx

export default function Pagination({
    currentPage = 1,
    totalPage = 1,
    totalData = 0,
    currentCount = 0,
    onPageChange = () => { }
}) {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between border-t-2 border-ink mt-10 pb-10">
            <p className="text-sm text-slate-600">
                Menampilkan <span className="font-black text-ink">{currentCount || 0}</span> dari{" "}
                <span className="font-black text-ink">{totalData}</span>
            </p>
            <div className="flex items-center gap-1.5">
                {/* prev page */}
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="px-3 py-1.5 text-xs font-black bg-white border-2 border-ink rounded-lg text-ink shadow-[2px_2px_0_#161616] hover:bg-lime disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-colors cursor-pointer"
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
                            className={`w-8 h-8 text-xs font-black rounded-lg transition-colors cursor-pointer ${currentPage === pageNumber
                                ? 'bg-ink text-cream border-2 border-ink shadow-[2px_2px_0_#161616]'
                                : 'bg-white text-ink border-2 border-ink hover:bg-lime'
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
                    className="px-3 py-1.5 text-xs font-black bg-white border-2 border-ink rounded-lg text-ink shadow-[2px_2px_0_#161616] hover:bg-lime disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-colors cursor-pointer"
                >
                    selanjutnya
                </button>
            </div>
        </div>
    );
}