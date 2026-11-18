import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import '../styles/components/form-controls.css'

// Menu items act on pointer up, so the click that follows would land on the form or dialog opening under the cursor
function afterClick(action) {
  return () => setTimeout(action)
}

// The backend refuses to delete an item while it's on loan, so Delete is off for lent out items
export default function ItemMenu({ item, onEdit, onDelete }) {
  return (
    <MenuTrigger>
      <Button className="item-menu-button" aria-label={`More options for ${item.name}`}>
        <MoreHorizontal size={19} />
      </Button>
      <Popover className="field-popover" placement="bottom end">
        <Menu className="field-list">
          <MenuItem className="field-option" textValue="Edit" onAction={afterClick(onEdit)}>
            <Pencil size={14} aria-hidden="true" />
            Edit
          </MenuItem>
          <MenuItem
            className="field-option is-danger"
            textValue="Delete"
            isDisabled={item.available === false}
            onAction={afterClick(onDelete)}
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}
