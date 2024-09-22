import { rational } from './rational';
import {
  tokenize,
  parse,
  evaluate,
  parseRationalExpression,
  BinaryExpressionNode,
} from './rational-expression';

describe('Math Parser', () => {
  describe('tokenize', () => {
    it('should tokenize a simple expression', () => {
      const tokens = tokenize('3 + 5');
      expect(tokens).toEqual(['3', '+', '5']);
    });

    it('should handle spaces correctly', () => {
      const tokens = tokenize(' 3 +  5 * ( 2 - 8 ) ');
      expect(tokens).toEqual(['3', '+', '5', '*', '(', '2', '-', '8', ')']);
    });

    it('should handle decimals', () => {
      const tokens = tokenize('3.5 * 2.1');
      expect(tokens).toEqual(['3.5', '*', '2.1']);
    });
  });

  describe('parse', () => {
    it('should parse a simple addition', () => {
      const tokens = tokenize('3 + 5');
      const ast = parse(tokens);
      expect(ast).toEqual(<BinaryExpressionNode>{
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Literal', value: rational(3) },
        right: { type: 'Literal', value: rational(5) },
      });
    });

    it('should parse nested expressions', () => {
      const tokens = tokenize('3 + 5 * (2 - 8)');
      const ast = parse(tokens);
      expect(ast).toEqual(<BinaryExpressionNode>{
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Literal', value: rational(3) },
        right: {
          type: 'BinaryExpression',
          operator: '*',
          left: { type: 'Literal', value: rational(5) },
          right: {
            type: 'BinaryExpression',
            operator: '-',
            left: { type: 'Literal', value: rational(2) },
            right: { type: 'Literal', value: rational(8) },
          },
        },
      });
    });

    it('should handle negative numbers correctly', () => {
      const tokens = tokenize('-3 + 5');
      const ast = parse(tokens);
      expect(ast).toEqual(<BinaryExpressionNode>{
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Literal', value: rational(-3) },
        right: { type: 'Literal', value: rational(5) },
      });
    });
  });

  describe('evaluate', () => {
    it('should evaluate a simple addition', () => {
      const tokens = tokenize('3 + 5');
      const ast = parse(tokens);
      const result = evaluate(ast);
      expect(result).toEqual(rational(8));
    });

    it('should evaluate nested expressions', () => {
      const tokens = tokenize('3 + 5 * (2 - 8)');
      const ast = parse(tokens);
      const result = evaluate(ast);
      expect(result).toEqual(rational(-27));
    });

    it('should handle division and float results', () => {
      const tokens = tokenize('10 / 4');
      const ast = parse(tokens);
      const result = evaluate(ast);
      expect(result).toEqual(rational(2.5));
    });
  });

  describe('parseRationalExpression', () => {
    it('should correctly evaluate a simple expression', () => {
      const result = parseRationalExpression('3 + 5');
      expect(result).toEqual(rational(8));
    });

    it('should correctly evaluate a complex expression', () => {
      const result = parseRationalExpression('3 + 5 * (2 - 8)');
      expect(result).toEqual(rational(-27));
    });

    it('should handle multiple operators', () => {
      const result = parseRationalExpression('3 + 5 - 2 * 4 / 2');
      expect(result).toEqual(rational(4));
    });

    it('should handle parentheses', () => {
      const result = parseRationalExpression('(3 + 5) * 2');
      expect(result).toEqual(rational(16));
    });

    it('should handle negative numbers', () => {
      const result = parseRationalExpression('-3 + 5');
      expect(result).toEqual(rational(2));
    });
  });
});
