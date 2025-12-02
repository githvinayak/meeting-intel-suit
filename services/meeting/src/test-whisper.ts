import { whisperClient } from './config/openai';
async function testWhisper() {
  console.log('🧪 Testing Whisper Client...\n');

  // Test 1: Check mode
  console.log('Mode:', whisperClient.isMockMode() ? 'MOCK (Free)' : 'REAL (Paid)');

  // Test 2: Mock transcription
  try {
    const result = await whisperClient.transcribe(
      '/fake/path/audio.mp3', // Doesn't matter in mock mode
      'test-meeting-123'
    );

    console.log('\n✅ Transcription Result:');
    console.log('Duration:', result.duration, 'seconds');
    console.log('Language:', result.language);
    console.log('Cost:', `$${result.cost.toFixed(4)}`);
    console.log('Segments:', result.segments.length);
    console.log('\nFirst segment:', result.segments[0]);

    // Test 3: Cost summary
    console.log('\n💰 Cost Summary:');
    const summary = whisperClient.getCostSummary();
    console.log('Total spent:', `$${summary.totalCost.toFixed(4)}`);
    console.log('Remaining credits:', `$${summary.remainingCredits.toFixed(2)}`);
    console.log('Transcriptions:', summary.transcriptionCount);
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testWhisper();
