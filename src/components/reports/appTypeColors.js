// FILE: src/components/reports/appTypeColors.js

/**
 * Get color scheme for application type badges
 * @param {string} appType - Application type value
 * @returns {object} - Object with background and text colors
 */
export const getAppTypeColor = (appType) => {
  if (!appType) {
    return {
      background: '#6B7280',
      text: '#FFFFFF',
      label: 'No App Type'
    };
  }

  const appTypeLower = appType.toLowerCase();

  // Color mapping for different application types
  const colorMap = {
    'initial': {
      background: '#3B82F6',  // Blue
      text: '#FFFFFF'
    },
    'renewal': {
      background: '#10B981',  // Green
      text: '#FFFFFF'
    },
    'variation': {
      background: '#F59E0B',  // Amber/Orange
      text: '#FFFFFF'
    },
    're-application': {
      background: '#8B5CF6',  // Purple
      text: '#FFFFFF'
    },
    'reapplication': {
      background: '#8B5CF6',  // Purple
      text: '#FFFFFF'
    },
    'monitored release': {
      background: '#EF4444',  // Red
      text: '#FFFFFF'
    },
    'monitored release-covid related': {
      background: '#DC2626',  // Dark Red
      text: '#FFFFFF'
    },
    'covid': {
      background: '#DC2626',  // Dark Red
      text: '#FFFFFF'
    }
  };

  // Check for exact matches
  if (colorMap[appTypeLower]) {
    return {
      ...colorMap[appTypeLower],
      label: appType
    };
  }

  // Check for partial matches
  for (const [key, colors] of Object.entries(colorMap)) {
    if (appTypeLower.includes(key)) {
      return {
        ...colors,
        label: appType
      };
    }
  }

  // Default color for unknown types
  return {
    background: '#6366F1',  // Indigo
    text: '#FFFFFF',
    label: appType
  };
};

/**
 * Application Type Badge Component
 * @param {string} appType - Application type value
 * @param {object} style - Additional styles
 */
export const AppTypeBadge = ({ appType, style = {} }) => {
  const colors = getAppTypeColor(appType);
  
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        background: colors.background,
        color: colors.text,
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {colors.label}
    </span>
  );
};