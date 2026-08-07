import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

export default function CustomDatePicker({ value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Parse value to Date or use today
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value + 'T00:00:00') : new Date()
  })

  const [displayMonth, setDisplayMonth] = useState(currentDate.getMonth())
  const [displayYear, setDisplayYear] = useState(currentDate.getFullYear())

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setCurrentDate(d)
      setDisplayMonth(d.getMonth())
      setDisplayYear(d.getFullYear())
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(displayYear, displayMonth, 1).getDay()

  const handlePrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11)
      setDisplayYear(displayYear - 1)
    } else {
      setDisplayMonth(displayMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0)
      setDisplayYear(displayYear + 1)
    } else {
      setDisplayMonth(displayMonth + 1)
    }
  }

  const handleSelectDate = (day) => {
    const newDate = new Date(displayYear, displayMonth, day)
    setCurrentDate(newDate)
    const yyyy = newDate.getFullYear()
    const mm = String(newDate.getMonth() + 1).padStart(2, '0')
    const dd = String(newDate.getDate()).padStart(2, '0')
    onChange(`${yyyy}-${mm}-${dd}`)
    setIsOpen(false)
  }

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const days = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

  return (
    <div className='relative' ref={containerRef}>
      {label && <label className='text-[10px] font-bold text-text-muted uppercase mb-1.5 block'>{label}</label>}
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='w-full flex items-center justify-between bg-bg border border-border focus:border-accent rounded-xl px-3 py-2 text-sm outline-none font-mono text-foreground hover:bg-surface-hover transition-colors'
      >
        <span>{value ? value.split('-').reverse().join('/') : 'Seleccionar fecha'}</span>
        <CalendarIcon className='w-4 h-4 text-text-muted' />
      </button>

      {isOpen && (
        <div className='absolute z-50 bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-2xl p-4 shadow-2xl animate-fadeIn'>
          <div className='flex items-center justify-between mb-4'>
            <button type='button' onClick={handlePrevMonth} className='p-1 hover:bg-surface-hover rounded-lg text-text-muted transition-colors'><ChevronLeft className='w-4 h-4' /></button>
            <span className='text-sm font-bold text-foreground'>{months[displayMonth]} {displayYear}</span>
            <button type='button' onClick={handleNextMonth} className='p-1 hover:bg-surface-hover rounded-lg text-text-muted transition-colors'><ChevronRight className='w-4 h-4' /></button>
          </div>
          <div className='grid grid-cols-7 gap-1 mb-2'>
            {days.map(d => <div key={d} className='text-center text-[10px] font-bold text-text-muted uppercase'>{d}</div>)}
          </div>
          <div className='grid grid-cols-7 gap-1'>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={'empty-'+i} className='h-8' />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const isSelected = currentDate.getDate() === day && currentDate.getMonth() === displayMonth && currentDate.getFullYear() === displayYear
              const isToday = new Date().getDate() === day && new Date().getMonth() === displayMonth && new Date().getFullYear() === displayYear
              return (
                <button
                  key={day}
                  type='button'
                  onClick={() => handleSelectDate(day)}
                  className={'h-8 rounded-lg text-xs font-medium transition-colors flex items-center justify-center ' + (isSelected ? 'bg-accent text-white font-bold shadow-md shadow-accent/20' : isToday ? 'bg-accent/10 text-accent font-bold' : 'text-foreground hover:bg-surface-hover')}
                >
                  {day}
                </button>
              )
            })}
          </div>
          <div className='mt-4 pt-3 border-t border-border flex justify-between items-center'>
            <button type='button' onClick={() => { onChange(''); setIsOpen(false) }} className='text-[10px] font-bold text-text-muted hover:text-foreground transition-colors'>Limpiar</button>
            <button type='button' onClick={() => { const today = new Date(); const y = today.getFullYear(); const m = String(today.getMonth()+1).padStart(2,'0'); const d = String(today.getDate()).padStart(2,'0'); onChange(`${y}-${m}-${d}`); setIsOpen(false) }} className='text-[10px] font-bold text-accent hover:text-accent-hover transition-colors'>Ir a Hoy</button>
          </div>
        </div>
      )}
    </div>
  )
}
