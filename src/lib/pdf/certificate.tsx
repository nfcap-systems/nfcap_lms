import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontFamily: 'Helvetica',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'solid',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeText: { color: '#ffffff', fontSize: 24, fontFamily: 'Helvetica-Bold' },
  kicker: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    letterSpacing: 2,
    marginBottom: 12,
  },
  learnerName: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 10 },
  body: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  courseTitle: {
    fontSize: 19,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
  },
  courseCategory: { fontSize: 11, color: '#6b7280', marginBottom: 24 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 320,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
    paddingTop: 16,
    marginTop: 8,
  },
  footerText: { fontSize: 10, color: '#6b7280' },
});

/** Mirrors CertificateDocument.tsx's on-screen layout (src/components/learner/CertificateDocument.tsx)
 * so the downloaded PDF matches what the learner already sees in the drawer — @react-pdf/renderer's
 * primitives, not that component itself, since it can't render plain DOM. */
function CertificatePdfDocument({
  learnerName,
  courseTitle,
  courseCategory,
  issuedDate,
  certificateCode,
}: {
  learnerName: string;
  courseTitle: string;
  courseCategory: string;
  issuedDate: string;
  certificateCode: string;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>N</Text>
          </View>
          <Text style={styles.kicker}>NFCAP · CERTIFICATE OF COMPLETION</Text>
          <Text style={styles.learnerName}>{learnerName}</Text>
          <Text style={styles.body}>has successfully completed the requirements for</Text>
          <Text style={styles.courseTitle}>{courseTitle}</Text>
          <Text style={styles.courseCategory}>{courseCategory}</Text>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Issued {issuedDate}</Text>
            <Text style={styles.footerText}>{certificateCode}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderCertificatePdfBuffer(args: {
  learnerName: string;
  courseTitle: string;
  courseCategory: string;
  issuedDate: string;
  certificateCode: string;
}): Promise<Buffer> {
  return renderToBuffer(<CertificatePdfDocument {...args} />);
}
