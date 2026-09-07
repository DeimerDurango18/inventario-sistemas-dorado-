import json
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_change(db: Session, user_id: int, empresa_id: int, entity_type: str, entity_id: int, action: str, old_values: dict = None, new_values: dict = None):
    """
    Registra un cambio en la entidad para auditoría.
    """
    changes = {}
    if old_values and new_values:
        for key, new_val in new_values.items():
            old_val = old_values.get(key)
            if old_val != new_val:
                changes[key] = {"old": str(old_val), "new": str(new_val)}
    elif new_values:
        changes = {k: {"old": None, "new": str(v)} for k, v in new_values.items()}
    elif old_values:
        changes = {k: {"old": str(v), "new": None} for k, v in old_values.items()}

    if not changes and action == "UPDATE":
        return # No hubo cambios reales

    audit_entry = AuditLog(
        empresa_id=empresa_id,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        changes=json.dumps(changes) if changes else None
    )
    db.add(audit_entry)
    db.commit()
