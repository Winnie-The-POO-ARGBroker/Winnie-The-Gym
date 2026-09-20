import { useState, useEffect } from 'react'
import api from '../services/api'

export function useClassAttendees(classId) {
  const [attendees, setAttendees] = useState([])

  const fetchAttendees = async () => {
    if (!classId) return
    try {
      const res = await api.get(`/classes/clases/${classId}/`)
      setAttendees(res.data.inscripciones || [])
    } catch (err) {
      console.error('Error fetching attendees:', err)
      setAttendees([])
    }
  }

  useEffect(() => {
    fetchAttendees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]) // fetchAttendees is stable within component scope; classId is the real trigger

  const toggleStatus = async (attendeeId, newStatus) => {
    // newStatus is conceptually 'presente' | 'ausente' in UI,
    // but the backend uses `asistio` boolean.
    // Let's assume newStatus logic: if setting to 'presente', asistio=True.
    const asistio = newStatus === 'presente'
    try {
      await api.patch(`/classes/inscripciones/${attendeeId}/`, { asistio })
      // Update local state to reflect UI changes immediately or refetch
      setAttendees((prev) =>
        prev.map((att) =>
          att.id === attendeeId
            ? { ...att, asistio }
            : att
        )
      )
    } catch (err) {
      console.error('Error updating attendance status:', err)
    }
  }

  const saveAttendees = () => {
    fetchAttendees()
  }

  return {
    attendees,
    setAttendees,
    toggleStatus,
    saveAttendees,
    fetchAttendees,
  }
}
