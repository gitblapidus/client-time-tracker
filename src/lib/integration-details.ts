export const INTERFACE_ARCHITECTURE_FIELDS = [
  { key: "source", label: "Source" },
  { key: "target", label: "Target" },
  { key: "interfaceType", label: "Interface Type" },
  { key: "interfaceFormat", label: "Interface Format" },
  { key: "dataDependencies", label: "Data Dependencies" },
  { key: "jobDependencies", label: "Job Dependencies" },
  { key: "frequency", label: "Frequency" },
  { key: "scheduledMechanism", label: "Scheduled Mechanism" },
  { key: "performanceConsiderations", label: "Performance Considerations" },
  { key: "interfaceTimeoutValue", label: "Interface Time-Out Value" },
  { key: "expectedDataVolume", label: "Expected Data Volume" },
] as const;

export type InterfaceArchitectureKey = (typeof INTERFACE_ARCHITECTURE_FIELDS)[number]["key"];
