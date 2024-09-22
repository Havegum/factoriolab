import { rational, Rational } from './rational';

export interface ASTNode {
  type: string;
}

export interface LiteralNode extends ASTNode {
  type: 'Literal';
  value: Rational;
}

export interface BinaryExpressionNode extends ASTNode {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

type Token = string;

export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let numberBuffer: string[] = [];

  const flushNumberBuffer = (): void => {
    if (numberBuffer.length > 0) {
      tokens.push(numberBuffer.join(''));
      numberBuffer = [];
    }
  };

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    if (/\d/.test(char) || char === '.') {
      numberBuffer.push(char);
    } else if (/\s/.test(char)) {
      // Ignore whitespace
    } else {
      flushNumberBuffer();
      if (
        char === '-' &&
        (tokens.length === 0 ||
          ['(', '+', '-', '*', '/'].includes(tokens[tokens.length - 1]))
      ) {
        // Handle negative numbers
        numberBuffer.push(char);
      } else {
        tokens.push(char);
      }
    }
  }

  flushNumberBuffer();

  return tokens;
}

export function parse(tokens: Token[]): ASTNode {
  let position = 0;

  function parseExpression(): ASTNode {
    let node = parseTerm();

    while (tokens[position] === '+' || tokens[position] === '-') {
      const operator = tokens[position];
      position++;
      const rightNode = parseTerm();
      node = {
        type: 'BinaryExpression',
        operator,
        left: node,
        right: rightNode,
      } as BinaryExpressionNode;
    }

    return node;
  }

  function parseTerm(): ASTNode {
    let node = parseFactor();

    while (tokens[position] === '*' || tokens[position] === '/') {
      const operator = tokens[position];
      position++;
      const rightNode = parseFactor();
      node = {
        type: 'BinaryExpression',
        operator,
        left: node,
        right: rightNode,
      } as BinaryExpressionNode;
    }

    return node;
  }

  function parseFactor(): ASTNode {
    const token = tokens[position];

    if (!isNaN(Number(token))) {
      position++;
      return { type: 'Literal', value: rational(token) } as LiteralNode;
    }

    if (token === '(') {
      position++;
      const node = parseExpression();
      if (tokens[position] !== ')') {
        throw new Error('Expected closing parenthesis');
      }
      position++;
      return node;
    }

    throw new Error('Unexpected token: ' + token);
  }

  return parseExpression();
}

export function evaluate(node: ASTNode): Rational {
  if (node.type === 'Literal') {
    return (node as LiteralNode).value;
  }

  if (node.type === 'BinaryExpression') {
    const binaryNode = node as BinaryExpressionNode;
    const left = evaluate(binaryNode.left);
    const right = evaluate(binaryNode.right);

    switch (binaryNode.operator) {
      case '+':
        return left.add(right);
      case '-':
        return left.sub(right);
      case '*':
        return left.mul(right);
      case '/':
        return left.div(right);
    }
  }

  throw new Error('Unexpected node type: ' + node.type);
}

export function parseRationalExpression(expression: string): Rational {
  const tokens = tokenize(expression);
  console.log(tokens);

  const ast = parse(tokens);
  console.log(ast);

  const result = evaluate(ast);
  console.log(result);

  return result;
}
