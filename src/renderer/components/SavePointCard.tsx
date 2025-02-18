import { useCallback, useEffect, useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import CreatableSelect from "react-select/creatable";
import { StylesConfig, OnChangeValue } from "react-select";
import { format, formatDistance } from "date-fns";
import lodashDebounce from "lodash.debounce";
import path from "path";
import { transparentize } from "polished";
import { useTranslation } from "react-i18next";

import Text from "./Text";
import Icon from "./Icon";
import Image from "./Image";
import Button from "./Button";
import DefaultConfirmModal from "./DefaultConfirmModal";
import SavePointContextMenu from "./SavePointContextMenu";

import useContextMenu from "../utils/useContextMenu";
import useElectronApiRequest, {
  makeElectronApiRequest,
} from "../utils/useElectronApiRequest";
import { useGamesStore } from "../utils/stores";

const DEFAULT_CARD_HEIGHT = 160;
const MAX_IMG_WIDTH = (DEFAULT_CARD_HEIGHT * 16) / 9;
const CARD_BORDER_RADIUS = 10;

const changeSavePointNameDebounced = lodashDebounce(
  (gameId: string, savePointId: string, newName: string) => {
    const makeReq = makeElectronApiRequest(window.api.changeSavePointName);
    makeReq(gameId, savePointId, newName);
  },
  1000
);

type TOption = { value: string; label: string };

type TProps = {
  game: TGame;
  gameSavesPath: string;
  savePoint: TSavePoint;
  className?: string;
};

const SavePointCard = (props: TProps) => {
  const { game, gameSavesPath, savePoint, className } = props;
  const { t } = useTranslation();
  const theme = useTheme();
  const [name, setName] = useState<string>(savePoint.name);
  const tags = useGamesStore((state) => state.tags);
  const [removeSavePoint] = useElectronApiRequest(window.api.removeSavePoint);
  const [loadSavePoint] = useElectronApiRequest(window.api.loadSavePoint);
  const [addToFavorite] = useElectronApiRequest(window.api.addToFavorite);
  const [savePointToDelete, setSavePointToDelete] = useState<TSavePoint>();
  const [savePointToLoad, setSavePointToLoad] = useState<TSavePoint>();
  const {
    showContextMenu,
    setShowContextMenu,
    getReferenceClientRect,
    onContextMenu,
  } = useContextMenu();

  const tagsInputOptions = useMemo(
    () => tags.map((t) => ({ value: t, label: t })),
    [tags]
  );

  const tagsInputStyles: StylesConfig = useMemo(
    () => ({
      valueContainer: (base) => ({ ...base, paddingLeft: 0, margin: -2 }),
      control: (base) => ({
        ...base,
        borderColor: transparentize(0.9, theme.purple),
        background: "transparent",
        borderTopColor: "transparent",
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
      }),
      indicatorSeparator: (base) => ({
        ...base,
      }),
      option: (base) => ({
        ...base,
        borderRadius: 40,
        cursor: "pointer",
      }),
      menu: (base) => ({
        ...base,
        background: "#1c1c1c",
        border: "1px solid rgba(0, 0, 0, 0.5)",
        boxShadow: "4px 4px 4px rgba(0, 0, 0, 0.25)",
      }),
      multiValue: (base) => ({
        ...base,
        borderRadius: 10,
      }),
      multiValueRemove: (base) => ({
        ...base,
        cursor: "pointer",
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        paddingLeft: 2,
      }),
    }),
    [theme]
  );

  const screenshotPath: string | undefined = useMemo(() => {
    if (savePoint?.screenshotFileName) {
      return path.normalize(
        path.join(
          "file://",
          gameSavesPath + `__${game.id}`,
          savePoint.folderName,
          "__screenshots",
          savePoint?.screenshotFileName
        )
      );
    }
    return undefined;
  }, [
    game.id,
    gameSavesPath,
    savePoint?.screenshotFileName,
    savePoint.folderName,
  ]);

  const formatedDate = (() => {
    const date = new Date(savePoint.date);
    const distance = formatDistance(date, new Date());
    return format(date, "dd.MM.yyyy, HH:mm") + " - " + distance + " ago";
  })();

  useEffect(() => {
    setName(savePoint.name);
  }, [savePoint.name]);

  const onChangeTags = useCallback(
    (newTags: OnChangeValue<TOption, true>) => {
      window.api.changeSavePointTags(
        game.id,
        savePoint.id,
        newTags.map((t) => t.value)
      );
    },
    [game.id, savePoint.id]
  );

  const onChangeName: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (newVal) => {
      const newName = newVal.target.value;
      setName(newName);
      changeSavePointNameDebounced(game.id, savePoint.id, newName);
    },
    [game.id, savePoint.id]
  );

  const onAddToFavorite = useCallback(() => {
    addToFavorite(game.id, savePoint.id);
  }, [game.id, savePoint.id, addToFavorite]);

  return (
    <SavePointContextMenu
      game={game}
      savePoint={savePoint}
      visible={showContextMenu}
      getReferenceClientRect={getReferenceClientRect}
      onRequestClose={(res) => {
        if (res?.shouldRemove) {
          setSavePointToDelete(savePoint);
        }
        setShowContextMenu(false);
      }}
    >
      <Container
        className={className}
        tabIndex={0}
        isFavorite={savePoint.isFavorite}
        onContextMenu={onContextMenu}
      >
        <ScreenshotContainer>
          <ScreenshotBackground
            src={screenshotPath}
            width={MAX_IMG_WIDTH}
            height={DEFAULT_CARD_HEIGHT}
          />
          <Screenshot
            src={screenshotPath}
            width={MAX_IMG_WIDTH}
            height={DEFAULT_CARD_HEIGHT}
          />
          <AddToFavorites
            title={t("button.add_to_favorites.label")}
            onClick={onAddToFavorite}
          >
            <AddToFavoritesIcon
              icon={savePoint.isFavorite ? "starSolid" : "starSolid"}
              size="small"
              color={savePoint.isFavorite ? "#ca9849" : "grey"}
            />
          </AddToFavorites>
        </ScreenshotContainer>

        <RightBlock>
          <Info>
            <Description>
              <Name
                type="text"
                title={savePoint.id}
                value={name}
                onChange={onChangeName}
              />
              <Type>
                {t(
                  savePoint?.type === "manual"
                    ? "save_point_card.manual_save"
                    : "save_point_card.autosave"
                )}{" "}
                {savePoint.saveNumberByType &&
                  " - " + savePoint.saveNumberByType}
              </Type>
            </Description>

            <CreatableSelect
              placeholder={t("save_point_card.no_tags")}
              isMulti
              isClearable
              closeMenuOnSelect={false}
              menuPortalTarget={document.body}
              options={tagsInputOptions}
              styles={tagsInputStyles}
              value={savePoint.tags.map((t) => ({ value: t, label: t }))}
              theme={(reactSelectTheme) => ({
                ...reactSelectTheme,
                colors: {
                  ...reactSelectTheme.colors,
                  primary: theme.purple,
                  primary75: transparentize(0.75, theme.purple),
                  primary50: transparentize(0.5, theme.purple),
                  primary25: transparentize(0.25, theme.purple),
                  neutral0: theme.white,
                  neutral5: transparentize(0.95, theme.purple),
                  neutral10: transparentize(0.5, theme.purple), // tags background
                  neutral20: transparentize(0.8, theme.purple),
                  neutral30: transparentize(0.7, theme.purple),
                  neutral40: transparentize(0.6, theme.purple),
                  neutral50: theme.dark,
                  neutral60: transparentize(0.4, theme.purple),
                  neutral70: transparentize(0.3, theme.purple),
                  neutral80: theme.white,
                  neutral90: transparentize(0.1, theme.purple),
                },
              })}
              // @ts-ignore
              onChange={onChangeTags}
            />

            <DateText>{formatedDate}</DateText>
          </Info>

          <CTAButtons>
            <Button
              title={t("button.load.tooltip")}
              icon="upload"
              onClick={() =>
                game.isPlaingNow
                  ? setSavePointToLoad(savePoint)
                  : loadSavePoint(game.id, savePoint.id)
              }
            >
              {t("button.load.label")}
            </Button>
            <Button
              icon="close"
              variant="secondary"
              onClick={() => setSavePointToDelete(savePoint)}
            />
          </CTAButtons>
        </RightBlock>

        <DefaultConfirmModal
          isOpen={!!savePointToDelete}
          title={t("modal.remove_save_point.label")}
          description={t("modal.remove_save_point.description")}
          onRequestClose={(result) => {
            if (result && savePointToDelete) {
              removeSavePoint(game.id, savePoint.id);
            }
            setSavePointToDelete(undefined);
          }}
        />

        <DefaultConfirmModal
          isOpen={!!savePointToLoad}
          title={t("modal.load_save_point.label")}
          description={t("modal.load_save_point.description")}
          onRequestClose={(result) => {
            if (result && savePointToLoad) {
              loadSavePoint(game.id, savePoint.id);
            }
            setSavePointToLoad(undefined);
          }}
        />
      </Container>
    </SavePointContextMenu>
  );
};

type TContainer = {
  isFavorite?: boolean;
};

const Container = styled.div<TContainer>`
  display: flex;
  align-items: center;
  width: 100%;
  min-height: ${DEFAULT_CARD_HEIGHT}px;
  background: #1c1c1c;
  border-radius: ${CARD_BORDER_RADIUS}px;
  margin-bottom: 15px;
  position: relative;
  box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.75);
  border: 1px solid
    ${({ isFavorite }) => (isFavorite ? "#ca9849" : "transparent")};
`;

const ScreenshotContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 400px;
  height: 100%;
  max-width: 35%;
  border-top-left-radius: ${CARD_BORDER_RADIUS}px;
  border-bottom-left-radius: ${CARD_BORDER_RADIUS}px;
  background: rgba(0, 0, 0, 0.25);
  overflow: hidden;
`;

const ScreenshotBackground = styled(Image)`
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.15;
`;

const Screenshot = styled(Image)`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const AddToFavoritesIcon = styled(Icon)``;

const AddToFavorites = styled.button`
  display: flex;
  align-items: center;
  position: absolute;
  top: 5px;
  left: 5px;
  background: transparent;
  border: none;
  border-radius: 5px;
  padding: 5px;
  stroke: black;
  stroke-width: 50px;
  stroke-linejoin: round;
  stroke-linecap: round;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    cursor: pointer;
  }
`;

const RightBlock = styled.div`
  flex: 1;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
`;

const Info = styled.div`
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
  margin-left: 25px;
  padding: 10px 0px;
`;

const Description = styled.div`
  display: flex;
  flex-direction: column;
`;

const Name = styled.input`
  font-style: normal;
  font-weight: 600;
  font-size: 24px;
  line-height: 32px;
  background: transparent;
  color: ${({ theme }) => theme.white};
  border: none;
  border-color: red;
  border-bottom-width: 1px;
`;

const Type = styled(Text)`
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 24px;
  color: ${({ theme }) => theme.dark};
  margin-top: 5px;
`;

const DateText = styled(Text)`
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 24px;
  color: ${({ theme }) => theme.dark};
`;

const CTAButtons = styled.div`
  display: flex;
  margin-left: 15px;
  margin-right: 25px;

  > {
    &:last-child {
      margin-left: 10px;
    }
  }
`;

export default SavePointCard;
