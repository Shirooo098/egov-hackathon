import React from 'react';

const ORGAN_DATA = [
  { name: 'Kidney',   pledges: 92, matchRate: 85, color: 'var(--primary)' },
  { name: 'Cornea',   pledges: 64, matchRate: 92, color: 'var(--emerald)' },
  { name: 'Liver',    pledges: 48, matchRate: 74, color: 'var(--sun)' },
  { name: 'Heart',    pledges: 24, matchRate: 60, color: 'var(--destructive)' },
  { name: 'Lung',     pledges: 12, matchRate: 50, color: '#7C3AED' },
  { name: 'Pancreas', pledges: 8,  matchRate: 40, color: '#EC4899' },
];

export default function OrganAnalytics({ role }) {
  const totalPledges = ORGAN_DATA.reduce((acc, curr) => acc + curr.pledges, 0);

  return (
    <div className="anim-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview Metric Cards */}
      <div className="grid-auto">
        <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Active Organ Pledges</span>
          <strong style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>{totalPledges}</strong>
          <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 600 }}>↑ 14% this month</span>
        </div>
        <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Transplants Completed</span>
          <strong style={{ fontSize: 28, fontWeight: 800, color: 'var(--emerald)' }}>89</strong>
          <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>DICT Audit Certified</span>
        </div>
        <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>eVerify Verification Rate</span>
          <strong style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy-mid)' }}>98.4%</strong>
          <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 600 }}>DICT Audit Certified</span>
        </div>
        <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Consents Secured</span>
          <strong style={{ fontSize: 28, fontWeight: 800, color: 'var(--destructive)' }}>100%</strong>
          <span style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>Encrypted Audit Registry</span>
        </div>
      </div>

      <div className="grid-2">
        {/* Left Card: National Organ Pledge Distribution */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>National Pledge Registry</h3>
            <span className="badge badge-primary">Organ Distribution</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ORGAN_DATA.map((o) => (
              <div key={o.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                  <span>{o.name}</span>
                  <span style={{ color: 'var(--foreground-muted)' }}>{o.pledges} Pledges ({Math.round(o.pledges / totalPledges * 100)}%)</span>
                </div>
                {/* Custom compatibility track indicator */}
                <div className="compat-track" style={{ height: 8 }}>
                  <div 
                    className="compat-fill" 
                    style={{ 
                      width: `${o.pledges / 92 * 100}%`, 
                      background: o.color,
                      borderRadius: 'var(--r-full)'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: Role-specific Context Report */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyItems: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                {role === 'recipient' && 'Transplant Match Insights'}
                {role === 'donor' && 'Pledge Legacy Impact'}
                {role === 'doctor' && 'Clinical Command Indicators'}
              </h3>
              <span className="badge badge-muted">Role Analytics</span>
            </div>

            {role === 'recipient' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '14px', background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Average Queue Duration</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>18.4 Days</div>
                  <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4 }}>Time elapsed from initial request verification to doctor diagnosis schedule proposal.</p>
                </div>
                <div style={{ padding: '14px', background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Transplant Success Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--emerald)' }}>94.2%</div>
                  <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4 }}>Percentage of matches completing successful clinical procedures.</p>
                </div>
              </div>
            )}

            {role === 'donor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '14px', background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Forecasted Lives Restored</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--emerald)' }}>192 Patients</div>
                  <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4 }}>Calculated capacity from cumulative active pledges across the region.</p>
                </div>
                <div style={{ padding: '14px', background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Digital Signature Encryption</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>256-bit Secured</div>
                  <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4 }}>E-signatures are encrypted instantly and verified on the DICT national audit registry.</p>
                </div>
              </div>
            )}

            {role === 'doctor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '14px', background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>AI Scheduler Accuracy</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>99.2%</div>
                  <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4 }}>Percentage of scheduling slots accepted by doctors, donors, and recipients.</p>
                </div>
                <div style={{ padding: '14px', background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Total System Transactions</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--destructive)' }}>4,821 Blocks</div>
                  <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4 }}>Total legal consents anchored on-chain for transplantation procedures.</p>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--primary-10)', border: '1px solid rgba(0,56,168,0.12)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--primary)', fontSize: 12, color: 'var(--primary)', lineHeight: 1.6, marginTop: 'auto' }}>
            Analytics are synced with the DOH Transplant Registry Database and validated by PSA/PhilSys.
          </div>
        </div>
      </div>
    </div>
  );
}
