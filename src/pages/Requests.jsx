import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { SUBJECTS } from '../lib/device'

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [description, setDescription] = useState('')

  async function load() {
    const { data } = await supabase
      .from('resource_requests')
      .select('*')
      .neq('subject', 'Feedback')
      .order('upvotes', { ascending: false })
    setRequests(data || [])
  }

  useEffect(() => { load() }, [])

  async function submit() {
    if (!description.trim()) return
    await supabase.from('resource_requests').insert({ subject, description: description.trim() })
    setDescription('')
    load()
  }

  async function upvote(r) {
    await supabase.from('resource_requests').update({ upvotes: (r.upvotes || 0) + 1 }).eq('id', r.id)
    load()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-6">Resource requests</h1>

      <div className="bg-parchmentDark border border-ink/20 shadow-card p-5 mb-8">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 mb-3">
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you missing? e.g. 'Grade 10 Science, unit 3 formative'"
          className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 h-20 resize-none mb-3"
        />
        <button onClick={submit} className="bg-library text-parchment font-body text-sm px-5 py-2 shadow-card hover:shadow-cardHover">
          Request it
        </button>
      </div>

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-parchment border border-ink/20 shadow-card p-4">
            <div>
              <p className="stamp text-[10px] text-oxblood mb-1">{r.subject}</p>
              <p className="font-body text-sm">{r.description}</p>
            </div>
            <button onClick={() => upvote(r)} className="font-body text-sm shrink-0 ml-4">▲ {r.upvotes || 0}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
