import React, { useState, useMemo, useRef, useEffect } from 'react';

const SmartComplianceDashboard = () => {
  const sampleData = [
    { id: 1, name: 'Clayton Shallue', company: 'Civil Services WA', role: 'Operator', courseCode: 'RTIOIRARP', courseDescription: 'RTIO Individual Rail Access Road Permit', expiryDate: '31/03/2024', status: 'Expired' },
    { id: 2, name: 'Disa Shallue', company: 'Civil Services WA', role: 'Operator', courseCode: 'RTIOLG', courseDescription: 'RTIO LG Grader', expiryDate: '03/05/2027', status: 'Current' },
    { id: 3, name: 'John Smith', company: 'Civil Services WA', role: 'Supervisor', courseCode: 'RTIOLC', courseDescription: 'RTIO Land Clearing', expiryDate: '15/06/2026', status: 'Current' },
  ];

  const [trainingData, setTrainingData] = useState(sampleData);
  const [selectedLearner, setSelectedLearner] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('Civil Services WA');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [searchLearner, setSearchLearner] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState('Active');
  const fileInputRef = useRef(null);

  // Webhook Handler for real-time updates from Make.com
  useEffect(() => {
    // Listen for custom webhook events
    const handleWebhookUpdate = (event) => {
      const newRecord = event.detail;
      
      if (newRecord && newRecord.data) {
        // Create record with unique ID
        const recordWithId = {
          id: Date.now(),
          name: newRecord.data.name || '',
          company: newRecord.data.company || 'Civil Services WA',
          role: newRecord.data.role || 'Operator',
          courseCode: newRecord.data.courseCode || '',
          courseDescription: newRecord.data.courseDescription || '',
          expiryDate: newRecord.data.expiryDate || '',
          status: newRecord.data.status || 'Current'
        };
        
        // Add to training data
        setTrainingData(prev => [...prev, recordWithId]);
        setLastUpdated(new Date());
        setWebhookStatus('Active - Just received data');
      }
    };

    // Add event listener for webhook updates
    window.addEventListener('smartcomplianceUpdate', handleWebhookUpdate);
    
    // Expose function for Make.com webhook to call
    window.updateSmartCompliance = (data) => {
      const event = new CustomEvent('smartcomplianceUpdate', { detail: data });
      window.dispatchEvent(event);
    };

    return () => {
      window.removeEventListener('smartcomplianceUpdate', handleWebhookUpdate);
      delete window.updateSmartCompliance;
    };
  }, []);

  // Auto-refresh every 6 hours
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 6 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const learners = useMemo(() => [...new Set(trainingData.map(d => d.name))].sort(), [trainingData]);
  const companies = useMemo(() => [...new Set(trainingData.map(d => d.company))], [trainingData]);
  const courses = useMemo(() => [...new Set(trainingData.map(d => d.courseCode))].sort(), [trainingData]);
  const statuses = ['Current', 'Expired', 'Due to Expire'];

  const filteredData = useMemo(() => {
    return trainingData.filter(record => {
      const matchLearner = !selectedLearner || record.name === selectedLearner;
      const matchCompany = !selectedCompany || record.company === selectedCompany;
      const matchStatus = !selectedStatus || record.status === selectedStatus;
      const matchCourse = !selectedCourse || record.courseCode === selectedCourse;
      const matchSearch = !searchLearner || record.name.toLowerCase().includes(searchLearner.toLowerCase());
      return matchLearner && matchCompany && matchStatus && matchCourse && matchSearch;
    });
  }, [selectedLearner, selectedCompany, selectedStatus, selectedCourse, searchLearner, trainingData]);

  const summary = useMemo(() => {
    const companyData = selectedCompany ? trainingData.filter(d => d.company === selectedCompany) : trainingData;
    return {
      current: companyData.filter(d => d.status === 'Current').length,
      expired: companyData.filter(d => d.status === 'Expired').length,
      dueExpire: companyData.filter(d => d.status === 'Due to Expire').length,
      total: companyData.length,
    };
  }, [selectedCompany, trainingData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const handleCSVImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const importedData = [];
        let id = trainingData.length + 1;

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue;
          
          const values = lines[i].split(',').map(v => v.trim());
          const record = {};
          
          headers.forEach((header, index) => {
            record[header] = values[index] || '';
          });

          if (record.name || record['Learner Name']) {
            importedData.push({
              id: id++,
              name: record['Learner Name'] || record['name'] || '',
              company: record['Company'] || record['company'] || 'Civil Services WA',
              role: record['Role'] || record['role'] || 'Operator',
              courseCode: record['Course Code'] || record['courseCode'] || '',
              courseDescription: record['Course Description'] || record['courseDescription'] || '',
              expiryDate: record['Expiry Date'] || record['expiryDate'] || '',
              status: record['Status'] || record['status'] || 'Current',
            });
          }
        }

        if (importedData.length > 0) {
          setTrainingData([...trainingData, ...importedData]);
          setLastUpdated(new Date());
          setShowImportModal(false);
          alert(`Successfully imported ${importedData.length} records!`);
          fileInputRef.current.value = '';
        } else {
          alert('No valid records found in CSV');
        }
      } catch (error) {
        alert('Error parsing CSV: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const headers = ['Learner Name', 'Company', 'Role', 'Course Code', 'Course Description', 'Expiry Date', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(record =>
        [record.name, record.company, record.role, record.courseCode, record.courseDescription, record.expiryDate, record.status].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartcompliance-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const pdfContent = `SmartCompliance - Training Dashboard Report
Generated: ${new Date().toLocaleDateString()}

Summary:
Total Records: ${summary.total}
Current: ${summary.current}
Expired: ${summary.expired}

Training Records:
${filteredData.map(r => `${r.name} | ${r.courseCode} | ${r.status}`).join('\n')}`;

    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartcompliance-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const demoSteps = [
    { title: 'Welcome to SmartCompliance', description: 'This interactive demo shows how to use the training dashboard.' },
    { title: 'Live Data Integration', description: 'Data flows directly from JotForm via Make.com automation - no manual imports needed!', action: () => {} },
    { title: 'Filter by Learner', description: 'Click on a learner name in the left panel to view their training records.', action: () => setSelectedLearner('Clayton Shallue') },
    { title: 'Filter by Status', description: 'Use the status filter to see only expired, current, or due to expire trainings.', action: () => { setSelectedStatus('Expired'); setSelectedLearner(''); } },
    { title: 'Search Learners', description: 'Use the search box to quickly find a specific learner by name.', action: () => { setSearchLearner('John'); setSelectedStatus(''); } },
    { title: 'Real-Time Updates', description: 'New submissions from JotForm appear here automatically in real-time!', action: () => setSearchLearner('') },
    { title: 'You\'re Ready!', description: 'Your SmartCompliance dashboard is now live and fully automated!' },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Current': return '#22c55e';
      case 'Expired': return '#ef4444';
      case 'Due to Expire': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--color-background-tertiary)', minHeight: '100vh' }}>
      {/* Demo Modal */}
      {showDemo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--color-background-primary)', padding: '2rem', borderRadius: 'var(--border-radius-lg)', maxWidth: '500px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '24px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
              {demoSteps[demoStep].title}
            </h2>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--color-text-secondary)', fontSize: '16px', lineHeight: '1.5' }}>
              {demoSteps[demoStep].description}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  if (demoStep > 0) setDemoStep(demoStep - 1);
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-background-secondary)',
                  border: `1px solid var(--color-border-tertiary)`,
                  borderRadius: 'var(--border-radius-md)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  if (demoStep < demoSteps.length - 1) {
                    demoSteps[demoStep].action?.();
                    setDemoStep(demoStep + 1);
                  } else {
                    setShowDemo(false);
                    setDemoStep(0);
                    setSelectedLearner('');
                    setSelectedStatus('');
                    setSearchLearner('');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#ea580c',
                  border: 'none',
                  borderRadius: 'var(--border-radius-md)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {demoStep === demoSteps.length - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: 'var(--color-background-primary)', padding: '2rem', borderRadius: 'var(--border-radius-lg)', maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '20px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Import Training Data</h2>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              Upload a CSV file from JotForm. (Note: With Make.com integration, new submissions appear automatically!)
            </p>
            <div style={{ border: '2px dashed var(--color-border-secondary)', borderRadius: 'var(--border-radius-lg)', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current.click()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ea580c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius-md)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Choose CSV File
              </button>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-background-secondary)',
                  border: `1px solid var(--color-border-tertiary)`,
                  borderRadius: 'var(--border-radius-md)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#ea580c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>✓</div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '500', color: 'var(--color-text-primary)' }}>SmartCompliance</h1>
            </div>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>Training & Compliance Dashboard</p>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text-tertiary)', fontSize: '12px' }}>
              🔗 {webhookStatus} | ⏰ Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isRefreshing ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
                border: `1px solid var(--color-border-tertiary)`,
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--color-text-primary)',
                cursor: isRefreshing ? 'default' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isRefreshing ? 0.6 : 1
              }}
            >
              {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
            </button>
            <button
              onClick={() => setShowDemo(true)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--color-background-primary)',
                border: `1px solid var(--color-border-tertiary)`,
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📚 Demo
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--color-background-primary)',
                border: `1px solid var(--color-border-tertiary)`,
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📤 Import CSV
            </button>
            <button
              onClick={exportCSV}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--color-background-primary)',
                border: `1px solid var(--color-border-tertiary)`,
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📥 Export CSV
            </button>
            <button
              onClick={exportPDF}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ea580c',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'var(--color-background-primary)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: `1px solid var(--color-border-tertiary)` }}>
          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>Total Records</p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '500', color: '#3b82f6' }}>{summary.total}</p>
        </div>
        <div style={{ backgroundColor: 'var(--color-background-primary)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: `1px solid var(--color-border-tertiary)` }}>
          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>Current</p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '500', color: '#22c55e' }}>{summary.current}</p>
        </div>
        <div style={{ backgroundColor: 'var(--color-background-primary)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: `1px solid var(--color-border-tertiary)` }}>
          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>Expired</p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '500', color: '#ef4444' }}>{summary.expired}</p>
        </div>
      </div>

      {/* Filter Panel and Data */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
        {/* Filters */}
        <div style={{ backgroundColor: 'var(--color-background-primary)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: `1px solid var(--color-border-tertiary)`, height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '16px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Filters</h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>Learner Name</label>
            <input
              type="text"
              placeholder="Search learner..."
              value={searchLearner}
              onChange={(e) => setSearchLearner(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', fontSize: '14px', border: `1px solid var(--color-border-tertiary)`, borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-primary)' }}>All Learners</label>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {learners.map(learner => (
                <label key={learner} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={selectedLearner === learner}
                    onChange={() => setSelectedLearner(selectedLearner === learner ? '' : learner)}
                    style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                  />
                  {learner}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Company</label>
            {companies.map(company => (
              <label key={company} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                <input
                  type="checkbox"
                  checked={selectedCompany === company}
                  onChange={() => setSelectedCompany(selectedCompany === company ? '' : company)}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
                {company}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Status</label>
            {statuses.map(status => (
              <label key={status} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                <input
                  type="checkbox"
                  checked={selectedStatus === status}
                  onChange={() => setSelectedStatus(selectedStatus === status ? '' : status)}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(status), marginRight: '0.5rem' }}></span>
                {status}
              </label>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Course Group</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', fontSize: '14px', border: `1px solid var(--color-border-tertiary)`, borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Training Matrix Table */}
        <div style={{ backgroundColor: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', border: `1px solid var(--color-border-tertiary)`, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: `1px solid var(--color-border-tertiary)` }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Training Matrix ({filteredData.length} records)</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-background-secondary)', borderBottom: `1px solid var(--color-border-tertiary)` }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-primary)' }}>Learner Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-primary)' }}>Course Code</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-primary)' }}>Course Description</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-primary)' }}>Expiry Date</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '500', color: 'var(--color-text-primary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((record) => (
                    <tr key={record.id} style={{ borderBottom: `1px solid var(--color-border-tertiary)` }}>
                      <td style={{ padding: '1rem', color: 'var(--color-text-primary)' }}>{record.name}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{record.courseCode}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>{record.courseDescription}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-primary)' }}>{record.expiryDate}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: 'var(--border-radius-md)',
                          backgroundColor: getStatusColor(record.status),
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No records match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', border: `1px solid var(--color-border-tertiary)` }}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Status Legend</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
            <span style={{ color: 'var(--color-text-primary)', fontSize: '14px' }}>Current - valid certification</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
            <span style={{ color: 'var(--color-text-primary)', fontSize: '14px' }}>Expired - requires renewal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
            <span style={{ color: 'var(--color-text-primary)', fontSize: '14px' }}>Due to expire - action needed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartComplianceDashboard;
