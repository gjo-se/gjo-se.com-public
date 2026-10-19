import List from '@src/components/primitives/List';

export interface UserProfileProps {
  name?: string
  email?: string
  role?: string
}
/**
 * UserProfile – Zeigt Benutzer-Stammdaten als DL-Liste.
 */
export default function UserProfile({ name, email, role }: UserProfileProps) {
  return (
    <div className="space-y-3">
      <List
        as="dl"
        definitions={[
          { dt: 'Name', dd: name },
          { dt: 'E-Mail', dd: email },
          { dt: 'Rolle', dd: role },
        ]}
      />
    </div>
  );
}
