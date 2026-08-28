import { useState, useEffect } from 'react'
import {
  getStoredAttendees,
  saveStoredAttendees,
} from '../services/adminMockData'

export function useClassAttendees(classId) {
  const [attendees, setAttendees] = useState([])

  useEffect(() => {
    if (classId) {
      if (import.meta.env.DEV) {
        setAttendees(getStoredAttendees(classId))
      } else {
        setAttendees([])
      }
    }
  }, [classId])

  const toggleStatus = (attendeeId, newStatus) => {
    setAttendees((prev) =>
      prev.map((att) =>
        att.id === attendeeId
          ? { ...att, estado: att.estado === newStatus ? 'sin_marcar' : newStatus }
          : att
      )
    )
  }

  const saveAttendees = () => {
    if (classId) {
      saveStoredAttendees(classId, attendees)
    }
  }

  return {
    attendees,
    setAttendees,
    toggleStatus,
    saveAttendees,
  }
}
