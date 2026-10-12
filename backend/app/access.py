FINANCE_FLAGS = {
    "MISSING_COST_CENTRE",
    "ALLOWANCE_MISSING_AMOUNT",
    "NEGATIVE_OR_ZERO_PAYMENT",
    "INVALID_COST_CENTRE",
}
HR_FLAGS = {
    "OUT_OF_RANGE_MONTHLY_HOURS_HIGH",
    "DEPARTMENT_MISMATCH",
}
END_USER_FLAGS = {"OUT_OF_RANGE_MONTHLY_HOURS_HIGH"}


def scope_for(user: dict) -> tuple[str | None, set[str] | None]:
    role = user.get("role")
    if role == "End User":
        return user.get("department") or "Manufacturing", END_USER_FLAGS
    if role == "Finance":
        return None, FINANCE_FLAGS
    if role == "HR":
        return None, HR_FLAGS
    if role == "Payroll Manager":
        return None, None
    return None, None


def hide_allowance(role: str | None) -> bool:
    return role == "Payroll Manager"
