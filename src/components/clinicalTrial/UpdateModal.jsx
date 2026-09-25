// FILE: src/components/clinicalTrial/UpdateModal.jsx
import { useState } from "react";
import { updateClinicalTrial } from "../../api/clinicalTrials.js";
import {
  TRIAL_FIELD_GROUPS,
  VALID_PHASE_OPTIONS,
  OTHER_PHASE_OPTION,
  DRUG_FIELD_DEFS,
  EMPTY_DRUG,
} from "./constants";
import { mapTrialToApi, getChangedFields } from "./clinicalTrialMappers";
import ConfirmChangesModal from "./ConfirmChangesModal";

function UpdateModal({ trial, onClose, onSaved, colors, darkMode }) {
  const [editForm, setEditForm] = useState({ ...trial });

  // The Phase dropdown shows "Others" whenever the trial's current phase
  // isn't one of the fixed presets — this covers both a genuinely custom
  // value already saved on the trial, and a fresh pick of "Others" made
  // during this edit session.
  const [isCustomPhase, setIsCustomPhase] = useState(
    !!trial.phase && !VALID_PHASE_OPTIONS.includes(trial.phase),
  );

  const [editSaveError, setEditSaveError] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  const handleFieldChange = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  // ── Drug row handlers (the "many" side) ──
  const handleDrugFieldChange = (index, key, value) => {
    setEditForm((prev) => {
      const drugs = [...(prev.drugs || [])];
      drugs[index] = { ...drugs[index], [key]: value };
      return { ...prev, drugs };
    });
  };

  const handleAddDrug = () => {
    setEditForm((prev) => ({
      ...prev,
      drugs: [...(prev.drugs || []), { ...EMPTY_DRUG }],
    }));
  };

  const handleRemoveDrug = (index) => {
    setEditForm((prev) => ({
      ...prev,
      drugs: (prev.drugs || []).filter((_, i) => i !== index),
    }));
  };
  // Step 1: validate + build the diff, then open the confirmation modal
  const handleRequestSave = () => {
    if (!editForm?.protocolNo?.trim()) {
      setEditSaveError("Protocol Number is required.");
      return;
    }
    const changes = getChangedFields(trial, editForm);
    if (changes.length === 0) {
      setEditSaveError("No changes were made.");
      return;
    }
    setEditSaveError(null);
    setPendingChanges(changes);
  };

  // Step 2: user confirmed in the diff modal — actually call the API
  const handleConfirmSave = async () => {
    setIsSavingEdit(true);
    setEditSaveError(null);
    try {
      await updateClinicalTrial(trial.id, mapTrialToApi(editForm));
      setPendingChanges(null);
      onSaved();
    } catch (err) {
      setPendingChanges(null);
      setEditSaveError(
        err?.response?.data?.detail || "Failed to save changes.",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "1rem",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0.9rem 1.1rem",
              borderBottom: `1px solid ${colors.cardBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              Update Trial
            </h3>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "1rem",
                cursor: "pointer",
                color: colors.textTertiary,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: "1rem 1.1rem", overflowY: "auto" }}>
            {editSaveError && (
              <div
                style={{
                  background: "#ef444415",
                  border: "1px solid #ef444450",
                  borderRadius: "8px",
                  padding: "0.5rem 0.75rem",
                  marginBottom: "0.75rem",
                  fontSize: "0.68rem",
                  color: "#ef4444",
                }}
              >
                {editSaveError}
              </div>
            )}

            {TRIAL_FIELD_GROUPS.map((group) => (
              <div key={group.title} style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: colors.textTertiary,
                    marginBottom: "0.4rem",
                  }}
                >
                  {group.title}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.6rem 1rem",
                  }}
                >
                  {group.fields.map((field) => {
                    const inputStyle = {
                      width: "100%",
                      padding: "0.35rem 0.5rem",
                      fontSize: "0.7rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      outline: "none",
                      boxSizing: "border-box",
                    };
                    return (
                      <div
                        key={field.key}
                        style={
                          field.type === "textarea"
                            ? { gridColumn: "1 / -1" }
                            : undefined
                        }
                      >
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.6rem",
                            color: colors.textTertiary,
                            marginBottom: "0.2rem",
                          }}
                        >
                          {field.label}
                          {field.required && (
                            <span style={{ color: "#ef4444" }}> *</span>
                          )}
                        </label>

                        {field.type === "textarea" ? (
                          <textarea
                            value={editForm[field.key] || ""}
                            onChange={(e) =>
                              handleFieldChange(field.key, e.target.value)
                            }
                            rows={2}
                            style={{ ...inputStyle, resize: "vertical" }}
                          />
                        ) : field.type === "phase" ? (
                          <>
                            <select
                              value={
                                isCustomPhase
                                  ? OTHER_PHASE_OPTION
                                  : editForm.phase || ""
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === OTHER_PHASE_OPTION) {
                                  setIsCustomPhase(true);
                                  // Clear the preset value so a stale
                                  // preset isn't saved alongside custom text
                                  handleFieldChange("phase", "");
                                } else {
                                  setIsCustomPhase(false);
                                  handleFieldChange("phase", value);
                                }
                              }}
                              style={inputStyle}
                            >
                              <option value="">—</option>
                              {VALID_PHASE_OPTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                              <option value={OTHER_PHASE_OPTION}>Others</option>
                            </select>
                            {isCustomPhase && (
                              <input
                                type="text"
                                value={editForm.phase || ""}
                                onChange={(e) =>
                                  handleFieldChange("phase", e.target.value)
                                }
                                placeholder="Enter custom phase (e.g. Expanded Access)"
                                maxLength={20}
                                style={{ ...inputStyle, marginTop: "0.35rem" }}
                              />
                            )}
                          </>
                        ) : field.type === "date" ? (
                          <input
                            type="date"
                            value={editForm.ilApprovalDate || ""}
                            onChange={(e) =>
                              handleFieldChange(
                                "ilApprovalDate",
                                e.target.value,
                              )
                            }
                            style={inputStyle}
                          />
                        ) : field.type === "number" ? (
                          <input
                            type="number"
                            min={0}
                            value={editForm.totalQtyApprove ?? 0}
                            onChange={(e) =>
                              handleFieldChange(
                                "totalQtyApprove",
                                e.target.value,
                              )
                            }
                            style={inputStyle}
                          />
                        ) : (
                          <input
                            type="text"
                            value={editForm[field.key] || ""}
                            onChange={(e) =>
                              handleFieldChange(field.key, e.target.value)
                            }
                            style={inputStyle}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {/* Investigational Products — repeatable, one trial can have
                multiple drug/IP rows (the "many" side of the relation). */}
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.4rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: colors.textTertiary,
                  }}
                >
                  Investigational Products
                </div>
                <button
                  onClick={handleAddDrug}
                  style={{
                    padding: "0.25rem 0.6rem",
                    background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.62rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add Drug
                </button>
              </div>

              {(editForm.drugs || []).length === 0 && (
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: colors.textTertiary,
                    padding: "0.5rem 0",
                  }}
                >
                  No drugs added yet.
                </div>
              )}

              {(editForm.drugs || []).map((drug, index) => (
                <div
                  key={index}
                  style={{
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: "8px",
                    padding: "0.6rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        color: colors.textTertiary,
                      }}
                    >
                      Drug #{index + 1}
                    </span>
                    <button
                      onClick={() => handleRemoveDrug(index)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.6rem 1rem",
                    }}
                  >
                    {DRUG_FIELD_DEFS.map((field) => {
                      const inputStyle = {
                        width: "100%",
                        padding: "0.35rem 0.5rem",
                        fontSize: "0.7rem",
                        background: colors.inputBg,
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: "6px",
                        color: colors.textPrimary,
                        outline: "none",
                        boxSizing: "border-box",
                      };
                      return (
                        <div
                          key={field.key}
                          style={
                            field.type === "textarea"
                              ? { gridColumn: "1 / -1" }
                              : undefined
                          }
                        >
                          <label
                            style={{
                              display: "block",
                              fontSize: "0.6rem",
                              color: colors.textTertiary,
                              marginBottom: "0.2rem",
                            }}
                          >
                            {field.label}
                          </label>
                          {field.type === "textarea" ? (
                            <textarea
                              value={drug[field.key] || ""}
                              onChange={(e) =>
                                handleDrugFieldChange(
                                  index,
                                  field.key,
                                  e.target.value,
                                )
                              }
                              rows={2}
                              style={{ ...inputStyle, resize: "vertical" }}
                            />
                          ) : field.type === "number" ? (
                            <input
                              type="number"
                              min={0}
                              value={drug.totalQtyApprove ?? 0}
                              onChange={(e) =>
                                handleDrugFieldChange(
                                  index,
                                  field.key,
                                  e.target.value,
                                )
                              }
                              style={inputStyle}
                            />
                          ) : (
                            <input
                              type="text"
                              value={drug[field.key] || ""}
                              onChange={(e) =>
                                handleDrugFieldChange(
                                  index,
                                  field.key,
                                  e.target.value,
                                )
                              }
                              style={inputStyle}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "0.75rem 1.1rem",
              borderTop: `1px solid ${colors.cardBorder}`,
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
            }}
          >
            <button
              onClick={onClose}
              disabled={isSavingEdit}
              style={{
                padding: "0.4rem 0.9rem",
                background: "transparent",
                border: `1px solid ${colors.cardBorder}`,
                color: colors.textPrimary,
                borderRadius: "6px",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: isSavingEdit ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleRequestSave}
              disabled={isSavingEdit}
              style={{
                padding: "0.4rem 0.9rem",
                background: "linear-gradient(135deg,#10B981,#059669)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: isSavingEdit ? "not-allowed" : "pointer",
                opacity: isSavingEdit ? 0.7 : 1,
              }}
            >
              {isSavingEdit ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {pendingChanges && (
        <ConfirmChangesModal
          changes={pendingChanges}
          isSaving={isSavingEdit}
          onBack={() => setPendingChanges(null)}
          onConfirm={handleConfirmSave}
          colors={colors}
        />
      )}
    </>
  );
}

export default UpdateModal;
