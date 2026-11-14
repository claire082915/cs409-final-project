import { useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import '../styles/components/page-scaffold.css'

function MockDetailPage({ label, value }) {
  return (
    <AppShell>
      <main className="screen-scaffold">
        <div className="screen-heading">
          <h1>
            {label} for {value}
          </h1>
        </div>
      </main>
    </AppShell>
  )
}

export default function ProfilePage() {
  const { displayName } = useParams()
  return <MockDetailPage label="Profile" value={displayName} />
}

export function ItemPage() {
  const { itemName } = useParams()
  return <MockDetailPage label="Item page" value={itemName} />
}
