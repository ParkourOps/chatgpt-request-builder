import { request, initialize } from '../dist';
import { expect, should } from 'chai';

describe('chat completion request (class)', function () {
  it('should error if request created before module initialization', function () {
    expect(() => request('gpt-3.5-turbo')).to.throw();
  });

  it("should return a response from OpenAI's ChatGPT LLM", async function () {
    initialize(
      process.env.API_KEY ?? "< No 'API_KEY' set in env. >",
      process.env.ORG_ID,
    );
    const res = await request('gpt-3.5-turbo')
      .systemPrompt('You have the role of a copywrighter.')
      .systemPrompt(
        'You write concisely, in a sophisticated and elegant tone of voice.',
      )
      .userPrompt('Write a short slogan for an airline.')
      .limitOutput(100)
      .go();
    console.debug(res.choices);
    expect(res.choices.length).to.be.greaterThan(0);
  });

  it("should return a response from OpenAI's ChatGPT LLM that does not include the specified words", async function () {
    const wordsToExclude = ['airline', 'aeroplane', 'aircraft'];
    const req = request('gpt-3.5-turbo')
      .systemPrompt('You have the role of a copywrighter.')
      .systemPrompt(
        'You write concisely, in a sophisticated and elegant tone of voice.',
      )
      .userPrompt('Write a short slogan for an airline.')
      .limitOutput(100);
    req.setBias(wordsToExclude, -100);
    const res = await req.go();
    console.debug(res.choices);
    expect(res.choices.length).to.be.greaterThan(0);
    expect(res.choices[0].message?.content).to.be.a('string');
    const _res = res.choices[0].message?.content;
    wordsToExclude.forEach(w => expect(_res).to.not.contain(w));
  });
});
