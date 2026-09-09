import "../../styles/components/hospital/OrganAnalytics.css";
import React from "react";

const ORGAN_DATA = [
  { name: "Kidney", pledges: 92, matchRate: 85, color: "var(--primary)" },
  { name: "Cornea", pledges: 64, matchRate: 92, color: "var(--emerald)" },
  { name: "Liver", pledges: 48, matchRate: 74, color: "var(--sun)" },
  { name: "Heart", pledges: 24, matchRate: 60, color: "var(--destructive)" },
  { name: "Lung", pledges: 12, matchRate: 50, color: "#7C3AED" },
  { name: "Pancreas", pledges: 8, matchRate: 40, color: "#EC4899" },
];

export default function OrganAnalytics({ role }) {
  const totalPledges = ORGAN_DATA.reduce((acc, curr) => acc + curr.pledges, 0);

  return (
    <div className="anim-up organ-analytics__1-1">
      {/* Overview Metric Cards */}
      <div className="grid-auto">
        <div className="card card-sm organ-analytics__2-1">
          <span className="organ-analytics__3-1">Active Organ Pledges</span>
          <strong className="organ-analytics__4-1">{totalPledges}</strong>
          <span className="organ-analytics__5-1">↑ 14% this month</span>
        </div>
        <div className="card card-sm organ-analytics__6-1">
          <span className="organ-analytics__7-1">Sample procedures</span>
          <strong className="organ-analytics__8-1">89</strong>
          <span className="organ-analytics__9-1">Sample dashboard data</span>
        </div>
        <div className="card card-sm organ-analytics__10-1">
          <span className="organ-analytics__11-1">Sample profile rate</span>
          <strong className="organ-analytics__12-1">98.4%</strong>
          <span className="organ-analytics__13-1">Prototype estimate</span>
        </div>
        <div className="card card-sm organ-analytics__14-1">
          <span className="organ-analytics__15-1">Sample agreements</span>
          <strong className="organ-analytics__16-1">100%</strong>
          <span className="organ-analytics__17-1">
            Simulated agreement records
          </span>
        </div>
      </div>

      <div className="grid-2">
        {/* Left Card: National Organ Pledge Distribution */}
        <div className="card">
          <div className="organ-analytics__18-1">
            <h3 className="organ-analytics__1-2">Sample pledge distribution</h3>
            <span className="badge badge-primary">Organ Distribution</span>
          </div>

          <div className="organ-analytics__19-1">
            {ORGAN_DATA.map((o) => (
              <div className="organ-analytics__20-1" key={o.name}>
                <div className="organ-analytics__21-1">
                  <span>{o.name}</span>
                  <span className="organ-analytics__2-2">
                    {o.pledges} Pledges (
                    {Math.round((o.pledges / totalPledges) * 100)}%)
                  </span>
                </div>
                {/* Custom compatibility track indicator */}
                <div className="compat-track organ-analytics__3-2">
                  <div
                    className="compat-fill organ-analytics__1-3"
                    style={{
                      width: `${(o.pledges / 92) * 100}%`,
                      background: o.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: Role-specific Context Report */}
        <div className="card organ-analytics__22-1">
          <div>
            <div className="organ-analytics__23-1">
              <h3 className="organ-analytics__4-2">
                {role === "recipient" && "Demo match insights"}
                {role === "donor" && "Sample pledge impact"}
                {role === "hospital" && "Demo workflow indicators"}
              </h3>
              <span className="badge badge-muted">Role Analytics</span>
            </div>

            {role === "recipient" && (
              <div className="organ-analytics__24-1">
                <div className="organ-analytics__25-1">
                  <div className="organ-analytics__5-2">
                    Average Queue Duration
                  </div>
                  <div className="organ-analytics__26-1">18.4 Days</div>
                  <p className="organ-analytics__27-1">
                    Time elapsed from initial request verification to clinical
                    schedule proposal.
                  </p>
                </div>
                <div className="organ-analytics__28-1">
                  <div className="organ-analytics__6-2">
                    Sample procedure rate
                  </div>
                  <div className="organ-analytics__29-1">94.2%</div>
                  <p className="organ-analytics__30-1">
                    Percentage of matches completing successful clinical
                    procedures.
                  </p>
                </div>
              </div>
            )}

            {role === "donor" && (
              <div className="organ-analytics__31-1">
                <div className="organ-analytics__32-1">
                  <div className="organ-analytics__7-2">
                    Illustrative pledge capacity
                  </div>
                  <div className="organ-analytics__33-1">192 Citizens</div>
                  <p className="organ-analytics__34-1">
                    Calculated capacity from cumulative active pledges across
                    the region.
                  </p>
                </div>
                <div className="organ-analytics__35-1">
                  <div className="organ-analytics__8-2">
                    Digital signature demo
                  </div>
                  <div className="organ-analytics__36-1">Simulated</div>
                  <p className="organ-analytics__37-1">
                    Signature actions are represented in this prototype and are
                    not verified on a national registry.
                  </p>
                </div>
              </div>
            )}

            {role === "hospital" && (
              <div className="organ-analytics__38-1">
                <div className="organ-analytics__39-1">
                  <div className="organ-analytics__9-2">
                    Schedule Proposal Accuracy
                  </div>
                  <div className="organ-analytics__40-1">99.2%</div>
                  <p className="organ-analytics__41-1">
                    Percentage of schedule proposals accepted by hospitals,
                    donors, and recipients.
                  </p>
                </div>
                <div className="organ-analytics__42-1">
                  <div className="organ-analytics__10-2">
                    Sample workflow records
                  </div>
                  <div className="organ-analytics__43-1">4,821 demo events</div>
                  <p className="organ-analytics__44-1">
                    Illustrative records in this prototype; no on-chain clinical
                    transactions are claimed.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="organ-analytics__45-1">
            Analytics use sample data for this prototype. They are not synced
            with a national registry or validated by PSA/PhilSys.
          </div>
        </div>
      </div>
    </div>
  );
}
