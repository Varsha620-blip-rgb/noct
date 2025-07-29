function Card({ title, value, icon, onClick }) {
  return (
    <div
      className="bg-[#9CCDDB] p-3 md:p-4 rounded-2xl gap-3 md:gap-5 m-2 md:m-4 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
      style={{
        boxShadow: '-8px 5px 10px #072D44'
      }}
      onClick={onClick}
    >
      <div className="flex flex-col items-start gap-3">
        <div className="flex items-center h-8 md:h-10 mt-1 md:mt-2 mb-2 md:mb-3 text-3xl md:text-5xl text-[#072D44]">{icon}</div>
        <div>
          <h2 className="text-sm md:text-[1.5rem] text-[#072D44]/90 font-500 ml-1 md:ml-3">{title}</h2>
          <p className="mt-1 md:mt-3 ml-1 md:ml-3 text-lg md:text-2xl font-semibold text-[#072D44]">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default Card