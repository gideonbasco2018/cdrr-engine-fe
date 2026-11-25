// src/components/monitoring/evaluatorAppTypes/EvaluatorAppTypesView.jsx
import { useEffect, useMemo, useState } from "react";
import { getEvaluatorAppTypes } from "../../../api/evaluatorAppTypes";
import UnitDailyActivity from "./UnitDailyActivity";

const DEFAULT_STEP = "QUALITY EVALUATION";
const ALL_STEPS = "__ALL__";

export default function EvaluatorAppTypesView({ ui, darkMode }) {
  const [step, setStep] = useState(DEFAULT_STEP);
  const [steps, setSteps] = useState([]);

  // Only the list of steps is needed here (for the Step dropdown)
  useEffect(() => {
    let cancelled = false;
    getEvaluatorAppTypes({})
      .then((res) => !cancelled && setSteps(res?.steps ?? []))
      .catch(() => !cancelled && setSteps([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // If the selected step does not exist in the data, fall back to the first one
  const activeStep = useMemo(() => {
    if (step === ALL_STEPS || steps.includes(step)) return step;
    return steps[0] || step;
  }, [steps, step]);

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem", color: ui.textPrimary }}>
          User Workload by Step
        </h2>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: "0.76rem",
            color: ui.textMuted,
          }}
        >
          Tasks decked to and tasks done by each unit and member, per day, month
          or year.
        </p>
      </div>

      <UnitDailyActivity
        ui={ui}
        darkMode={darkMode}
        step={activeStep}
        steps={steps}
        allValue={ALL_STEPS}
        onStepChange={setStep}
      />
    </div>
  );
}
