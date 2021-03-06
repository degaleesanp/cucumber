import { StrictArrayMultimap, StrictMap } from '@cucumber/gherkin'
import { messages, TimeConversion } from '@cucumber/messages'

export default class TestResultsQuery {
  private testResultByPickleId = new StrictArrayMultimap<
    string,
    messages.ITestResult
  >()
  private testStepResultsByPickleStepId = new StrictArrayMultimap<
    string,
    messages.ITestResult
  >()
  private testStepById = new StrictMap<string, messages.TestCase.ITestStep>()
  private pickleIdByTestStepId = new StrictMap<string, string>()

  public update(envelope: messages.IEnvelope) {
    if (envelope.testCase) {
      for (const testStep of envelope.testCase.testSteps) {
        this.testStepById.set(testStep.id, testStep)
        this.pickleIdByTestStepId.set(testStep.id, envelope.testCase.pickleId)
      }
    }

    if (envelope.testStepFinished) {
      const pickleId = this.pickleIdByTestStepId.get(
        envelope.testStepFinished.testStepId
      )
      this.testResultByPickleId.put(
        pickleId,
        envelope.testStepFinished.testResult
      )

      const testStep = this.testStepById.get(
        envelope.testStepFinished.testStepId
      )
      this.testStepResultsByPickleStepId.put(
        testStep.pickleStepId,
        envelope.testStepFinished.testResult
      )
    }
  }

  /**
   * Gets all the results for multiple pickle steps
   * @param pickleStepIds
   */
  public getPickleStepResults(pickleStepIds: string[]): messages.ITestResult[] {
    if (pickleStepIds.length === 0) {
      return [
        new messages.TestResult({
          status: messages.TestResult.Status.SKIPPED,
          duration: TimeConversion.millisecondsToDuration(0),
        }),
      ]
    }
    return pickleStepIds.reduce(
      (testResults: messages.ITestResult[], pickleId) => {
        return testResults.concat(
          this.testStepResultsByPickleStepId.get(pickleId)
        )
      },
      []
    )
  }

  /**
   * Gets all the results for multiple pickles
   * @param pickleIds
   */
  public getPickleResults(pickleIds: string[]): messages.ITestResult[] {
    if (pickleIds.length === 0) {
      return [
        new messages.TestResult({
          status: messages.TestResult.Status.UNDEFINED,
          duration: TimeConversion.millisecondsToDuration(0),
        }),
      ]
    }
    return pickleIds.reduce((testResults: messages.ITestResult[], pickleId) => {
      return testResults.concat(this.testResultByPickleId.get(pickleId))
    }, [])
  }

  /**
   * Gets the worst result
   * @param testResults
   */
  public getWorstResult(
    testResults: messages.ITestResult[]
  ): messages.ITestResult {
    return (
      testResults.sort((r1, r2) => r2.status - r1.status)[0] ||
      new messages.TestResult({
        status: messages.TestResult.Status.SKIPPED,
        duration: TimeConversion.millisecondsToDuration(0),
      })
    )
  }
}
