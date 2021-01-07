import styled from "styled-components";

import Button from "./Button";

type TProps = {
  label: string;
  path: string | undefined;
  description: string;
  isDisabled?: boolean;
  onClick: () => void;
};

const FileInput = (props: TProps) => {
  const { label, path, description, isDisabled, onClick } = props;

  const onShowInExplorer = () => {
    ipcRenderer.invoke("revealInFileExplorer", path);
  };

  return (
    <Container isDisabled={isDisabled}>
      <Label>{label}</Label>

      <InputContainer>
        <Top>
          <Path>{path ? path : "..."}</Path>

          <Button size="small" onClick={onClick}>
            Choose
          </Button>

          <Button
            icon="openInNew"
            size="small"
            title="Reveal in expolorer"
            onClick={onShowInExplorer}
          />
        </Top>

        <Description>{description}</Description>
      </InputContainer>
    </Container>
  );
};

type TContainer = {
  isDisabled?: boolean;
};

const Container = styled.div<TContainer>`
  display: flex;
  background: ${({ isDisabled }) => (isDisabled ? "red" : "transparent")};
`;

const Label = styled.div`
  width: 120px;
  padding-right: 20px;
  font-style: normal;
  font-weight: bold;
  font-size: 14px;
  line-height: 19px;
`;

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Top = styled.div`
  display: flex;

  > * {
    &:not(:first-child) {
      margin-left: 10px;
    }
  }
`;

const Path = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  background: #333;
  padding: 5px 15px;
  border-radius: 4px;
  font-weight: 300;
  font-size: 14px;
`;

const Description = styled.div`
  font-style: normal;
  font-weight: lighter;
  font-size: 14px;
  margin-top: 10px;
`;

export default FileInput;
